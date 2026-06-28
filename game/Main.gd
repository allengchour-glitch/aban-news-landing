# Neon Drift — Foundation (Godot 4, baut die 3D-Szene komplett im Code → keine
# externen Assets, garantiert importierbar). Der lokale Claude (GPU-Laptop) erweitert
# das hier mit Test/Polish: bessere Modelle (Blender), Partikel, Sound, Roguelite-Upgrades.
#
# Steuerung: ← → / A D (Touch-/Tilt-Steuerung fügt der lokale Claude leicht hinzu).
extends Node3D

const LANE_LIMIT := 7.0
const BASE_SPEED := 16.0

var player: MeshInstance3D
var camera: Camera3D
var obstacles: Array = []
var orbs: Array = []
var speed := BASE_SPEED
var target_x := 0.0
var score := 0
var best := 0
var alive := true
var spawn_timer := 0.0
var rng := RandomNumberGenerator.new()
var score_label: Label
var center_label: Label

func _ready() -> void:
	rng.randomize()
	_build_world()
	_build_player()
	_build_hud()

func _build_world() -> void:
	var amb := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.024, 0.027, 0.059)
	env.fog_enabled = true
	env.fog_light_color = Color(0.12, 0.16, 0.35)
	env.fog_density = 0.006
	env.glow_enabled = true
	env.glow_intensity = 0.9
	env.glow_bloom = 0.25
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.25, 0.30, 0.55)
	env.ambient_light_energy = 1.2
	amb.environment = env
	add_child(amb)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -30, 0)
	sun.light_energy = 1.3
	add_child(sun)

	var fill := OmniLight3D.new()
	fill.light_color = Color(0.37, 0.95, 1.0)
	fill.light_energy = 3.0
	fill.omni_range = 60.0
	fill.position = Vector3(0, 5, 4)
	add_child(fill)

	# Boden (lange Bahn) — hellere Neon-Optik
	var floor_mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(24, 600)
	floor_mi.mesh = pm
	floor_mi.position = Vector3(0, -1.5, -250)
	floor_mi.material_override = _mat(Color(0.10, 0.12, 0.28), Color(0.05, 0.08, 0.22))
	add_child(floor_mi)

	# Neon-Randstreifen links/rechts (Canyon-Gefühl)
	for side in [-1.0, 1.0]:
		var edge := MeshInstance3D.new()
		var em := BoxMesh.new()
		em.size = Vector3(0.4, 0.4, 600)
		edge.mesh = em
		edge.position = Vector3(side * 9.0, -1.2, -250)
		edge.material_override = _mat(Color(0.37, 0.95, 1.0), Color(0.37, 0.95, 1.0))
		add_child(edge)

	camera = Camera3D.new()
	camera.position = Vector3(0, 4.5, 11)
	camera.rotation_degrees = Vector3(-12, 0, 0)
	camera.fov = 72.0
	add_child(camera)

func _build_player() -> void:
	player = MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(1.4, 0.6, 2.0)
	player.mesh = bm
	player.material_override = _mat(Color(0.37, 0.95, 1.0), Color(0.1, 0.5, 0.7))
	player.position = Vector3(0, 0, 0)
	add_child(player)

func _mat(albedo: Color, emission: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = albedo
	m.emission_enabled = true
	m.emission = emission
	m.emission_energy_multiplier = 1.3
	return m

func _build_hud() -> void:
	var hud := CanvasLayer.new()
	add_child(hud)
	score_label = Label.new()
	score_label.position = Vector2(22, 16)
	score_label.add_theme_font_size_override("font_size", 30)
	score_label.add_theme_color_override("font_color", Color(0.37, 0.95, 1.0))
	hud.add_child(score_label)
	center_label = Label.new()
	center_label.anchors_preset = Control.PRESET_CENTER
	center_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center_label.add_theme_font_size_override("font_size", 40)
	center_label.add_theme_color_override("font_color", Color(1, 0.48, 0.85))
	center_label.text = ""
	hud.add_child(center_label)

func _spawn() -> void:
	var gap := rng.randf_range(-4.0, 4.0)
	for i in 2:
		var ob := MeshInstance3D.new()
		var h := rng.randf_range(2.0, 6.0)
		var bm := BoxMesh.new()
		bm.size = Vector3(1.6, h, 1.6)
		ob.mesh = bm
		var col := Color.from_hsv(rng.randf(), 0.7, 1.0)
		ob.material_override = _mat(col * 0.3, col)
		ob.position = Vector3(gap + (-4.0 if i == 0 else 4.0) + rng.randf_range(-1.0, 1.0), h * 0.5 - 1.5, -200)
		add_child(ob)
		obstacles.append(ob)
	if rng.randf() < 0.85:
		var orb := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.6
		sm.height = 1.2
		orb.mesh = sm
		orb.material_override = _mat(Color(1, 0.82, 0.4), Color(1, 0.82, 0.4))
		orb.position = Vector3(gap + rng.randf_range(-1.0, 1.0), 0, -206)
		add_child(orb)
		orbs.append(orb)

func _process(delta: float) -> void:
	if not alive:
		if Input.is_action_just_pressed("ui_accept") or Input.is_key_pressed(KEY_SPACE):
			_restart()
		return

	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		target_x -= 14.0 * delta
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		target_x += 14.0 * delta
	target_x = clamp(target_x, -LANE_LIMIT, LANE_LIMIT)
	player.position.x = lerp(player.position.x, target_x, 0.18)
	player.rotation.z = (player.position.x - target_x) * 0.15
	player.position.y = sin(Time.get_ticks_msec() * 0.005) * 0.2

	speed += delta * 0.4
	spawn_timer -= delta
	if spawn_timer <= 0.0:
		_spawn()
		spawn_timer = max(0.45, 1.2 - speed * 0.02)

	for ob in obstacles.duplicate():
		ob.position.z += speed * delta
		ob.rotate_y(delta)
		if ob.position.z > 14.0:
			obstacles.erase(ob); ob.queue_free()
		elif abs(ob.position.z) < 1.6 and abs(ob.position.x - player.position.x) < 1.5:
			_die()
	for orb in orbs.duplicate():
		orb.position.z += speed * delta
		orb.rotate_y(delta * 3.0)
		if orb.position.z > 14.0:
			orbs.erase(orb); orb.queue_free()
		elif abs(orb.position.z) < 1.4 and abs(orb.position.x - player.position.x) < 1.4:
			orbs.erase(orb); orb.queue_free()
			score += 1

	camera.position.x = lerp(camera.position.x, player.position.x * 0.4, 0.08)
	score_label.text = "Punkte: %d   Rekord: %d" % [score, best]

func _die() -> void:
	alive = false
	if score > best:
		best = score
	center_label.text = "Game Over\nPunkte: %d\n\n[Leertaste] nochmal" % score

func _restart() -> void:
	for ob in obstacles: ob.queue_free()
	for orb in orbs: orb.queue_free()
	obstacles.clear(); orbs.clear()
	speed = BASE_SPEED; target_x = 0.0; score = 0; spawn_timer = 0.0; alive = true
	player.position = Vector3(0, 0, 0)
	center_label.text = ""
