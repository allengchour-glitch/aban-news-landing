# Neon Drift — Godot 4 (code-only Szene, garantiert importierbar).
# Phase 3: Roguelite-Upgrades (variable Belohnung) + Juice (Screenshake, Pop, Near-Miss).
# Steuerung: ← → / A D · Upgrade-Wahl: 1 / 2 / 3 · Neustart: Leertaste.
extends Node3D

const LANE_LIMIT := 7.0
const BASE_SPEED := 16.0
const UPGRADES := [
	{"id": "magnet", "name": "🧲 Magnet — Orbs ziehen an"},
	{"id": "schild", "name": "🛡️ Schild — +1 Treffer frei"},
	{"id": "doppel", "name": "✨ Doppel-Punkte"},
	{"id": "schmal", "name": "📏 Schmaler — besser ausweichen"},
	{"id": "ruhe", "name": "🐢 Ruhe — etwas langsamer"},
	{"id": "orbplus", "name": "🟡 Mehr Orbs"},
]

var player: MeshInstance3D
var camera: Camera3D
var obstacles: Array = []
var orbs: Array = []
var speed := BASE_SPEED
var speed_growth := 0.4
var target_x := 0.0
var cam_base_x := 0.0
var score := 0
var best := 0
var score_mult := 1
var shields := 0
var magnet := false
var hitbox := 1.5
var orb_chance := 0.85
var orbs_collected := 0
var next_upgrade_at := 5
var choosing := false
var choices: Array = []
var shake := 0.0
var pop := 1.0
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

	var floor_mi := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(24, 600)
	floor_mi.mesh = pm
	floor_mi.position = Vector3(0, -1.5, -250)
	floor_mi.material_override = _mat(Color(0.10, 0.12, 0.28), Color(0.05, 0.08, 0.22))
	add_child(floor_mi)

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
	score_label.add_theme_font_size_override("font_size", 28)
	score_label.add_theme_color_override("font_color", Color(0.37, 0.95, 1.0))
	hud.add_child(score_label)
	center_label = Label.new()
	center_label.anchors_preset = Control.PRESET_CENTER
	center_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center_label.add_theme_font_size_override("font_size", 34)
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
	if rng.randf() < orb_chance:
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
		if Input.is_key_pressed(KEY_SPACE) or Input.is_action_just_pressed("ui_accept"):
			_restart()
		return
	if choosing:
		_handle_choice()
		return

	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		target_x -= 14.0 * delta
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		target_x += 14.0 * delta
	target_x = clamp(target_x, -LANE_LIMIT, LANE_LIMIT)
	player.position.x = lerp(player.position.x, target_x, 0.18)
	player.rotation.z = (player.position.x - target_x) * 0.15
	player.position.y = sin(Time.get_ticks_msec() * 0.005) * 0.2
	pop = lerp(pop, 1.0, 0.2)
	player.scale = Vector3.ONE * pop

	speed += delta * speed_growth
	spawn_timer -= delta
	if spawn_timer <= 0.0:
		_spawn()
		spawn_timer = max(0.45, 1.2 - speed * 0.02)

	for ob in obstacles.duplicate():
		ob.position.z += speed * delta
		ob.rotate_y(delta)
		if not ob.has_meta("near") and ob.position.z > 2.0 and ob.position.z < 13.0:
			var dx := abs(ob.position.x - player.position.x)
			if dx > hitbox and dx < hitbox + 1.3:
				ob.set_meta("near", true)
				score += 1
				shake = max(shake, 0.15)
		if ob.position.z > 14.0:
			obstacles.erase(ob); ob.queue_free()
		elif abs(ob.position.z) < 1.6 and abs(ob.position.x - player.position.x) < hitbox:
			if shields > 0:
				shields -= 1
				shake = 0.5
				obstacles.erase(ob); ob.queue_free()
			else:
				_die()

	for orb in orbs.duplicate():
		orb.position.z += speed * delta
		orb.rotate_y(delta * 3.0)
		if magnet and orb.position.z > -30.0:
			orb.position.x = lerp(orb.position.x, player.position.x, 0.06)
		if orb.position.z > 14.0:
			orbs.erase(orb); orb.queue_free()
		elif abs(orb.position.z) < 1.4 and abs(orb.position.x - player.position.x) < 1.6:
			orbs.erase(orb); orb.queue_free()
			score += score_mult
			orbs_collected += 1
			pop = 1.5
			shake = max(shake, 0.12)
			if orbs_collected >= next_upgrade_at:
				next_upgrade_at += 6
				_offer_upgrade()

	shake = max(0.0, shake - delta * 1.2)
	cam_base_x = lerp(cam_base_x, player.position.x * 0.4, 0.08)
	camera.position.x = cam_base_x + (randf() - 0.5) * shake * 2.0
	camera.position.y = 4.5 + (randf() - 0.5) * shake * 2.0
	_update_hud()

func _offer_upgrade() -> void:
	choosing = true
	choices = UPGRADES.duplicate()
	choices.shuffle()
	choices = choices.slice(0, 3)
	var t := "⬆️  UPGRADE — wähle:\n\n"
	for i in choices.size():
		t += "[%d]   %s\n" % [i + 1, choices[i]["name"]]
	center_label.text = t

func _handle_choice() -> void:
	var pick := -1
	if Input.is_key_pressed(KEY_1):
		pick = 0
	elif Input.is_key_pressed(KEY_2):
		pick = 1
	elif Input.is_key_pressed(KEY_3):
		pick = 2
	if pick >= 0 and pick < choices.size():
		_apply_upgrade(String(choices[pick]["id"]))
		choosing = false
		center_label.text = ""

func _apply_upgrade(id: String) -> void:
	match id:
		"magnet":
			magnet = true
		"schild":
			shields += 1
		"doppel":
			score_mult += 1
		"schmal":
			hitbox = max(0.9, hitbox - 0.35)
		"ruhe":
			speed = max(BASE_SPEED, speed - 4.0)
			speed_growth = max(0.2, speed_growth - 0.1)
		"orbplus":
			orb_chance = min(1.0, orb_chance + 0.15)

func _update_hud() -> void:
	var ups := ""
	if shields > 0:
		ups += "🛡️%d " % shields
	if magnet:
		ups += "🧲 "
	if score_mult > 1:
		ups += "✨x%d " % score_mult
	score_label.text = "Punkte: %d   Rekord: %d   %s" % [score, best, ups]

func _die() -> void:
	alive = false
	shake = 0.6
	if score > best:
		best = score
	center_label.text = "Game Over\nPunkte: %d\n\n[Leertaste] nochmal" % score

func _restart() -> void:
	for ob in obstacles:
		ob.queue_free()
	for orb in orbs:
		orb.queue_free()
	obstacles.clear()
	orbs.clear()
	speed = BASE_SPEED
	speed_growth = 0.4
	target_x = 0.0
	cam_base_x = 0.0
	score = 0
	score_mult = 1
	shields = 0
	magnet = false
	hitbox = 1.5
	orb_chance = 0.85
	orbs_collected = 0
	next_upgrade_at = 5
	choosing = false
	choices = []
	shake = 0.0
	pop = 1.0
	alive = true
	spawn_timer = 0.0
	player.position = Vector3(0, 0, 0)
	player.scale = Vector3.ONE
	center_label.text = ""
