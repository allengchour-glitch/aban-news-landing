# Neon Drift — Godot 4 (code-only Szene, garantiert importierbar, KEINE Asset-Importe nötig).
# ============================================================================================
# MEISTERKLASSE-Build. Was dieses Spiel "gut" statt "irgendeins" macht:
#  • FLOW/COMBO-System: Near-Misses (knapp an Hindernissen vorbei) bauen eine Combo auf, die
#    ALLES multipliziert und mit der Zeit verfällt → Risiko wird belohnt = der Sucht-Loop.
#  • DASH mit Aufladung: kurzer Boost + Unverwundbarkeit, lädt durch Orbs → Skill-Ausdruck.
#  • BIOME-Wechsel alle paar Sekunden: Farbe + Schwierigkeit steigen, mit Ansage → Meilensteine.
#  • JUICE: Partikel-Trail/Pickup/Explosion, Screen-Flash, Screenshake, Scale-Pop, dynamisches FOV.
#  • Tages-Challenge (deterministischer Seed) + Menü + Pause + Ton-Toggle + persistenter Rekord.
#  Alles in einem File, ohne externe Ressourcen → der lokale Claude testet/exportiert direkt.
#
# Steuerung:  ← → / A D bewegen ·  LEER/↑ Dash ·  1/2/3 Upgrade ·  ESC/P Pause ·  M Ton
#             Menü: LEER Start · D Tages-Challenge ·  Game Over: LEER Neustart
extends Node3D

enum State { MENU, PLAY, CHOOSE, PAUSE, DEAD }

const SAVE_PATH := "user://neondrift.save"
const LANE_LIMIT := 7.5
const BASE_SPEED := 18.0
const MOVE_SPEED := 17.0
const PHASE_TIME := 22.0          # Sekunden pro Biome
const COMBO_PER_MULT := 6         # so viele Combo-Punkte = +1x Multiplikator
const MULT_CAP := 9
const DASH_TIME := 0.42
const DASH_SPEED_BONUS := 26.0

# Biome-Paletten — Farbe + Stimmung rotieren für Frische und Fortschritts-Meilensteine.
const BIOMES := [
	{"name": "CYAN-SEKTOR", "edge": Color(0.37, 0.95, 1.0), "fog": Color(0.12, 0.16, 0.35), "orb": Color(1.0, 0.82, 0.4)},
	{"name": "MAGENTA-ZONE", "edge": Color(1.0, 0.35, 0.85), "fog": Color(0.26, 0.1, 0.3), "orb": Color(0.6, 1.0, 0.7)},
	{"name": "TOXIC-GRÜN", "edge": Color(0.45, 1.0, 0.45), "fog": Color(0.1, 0.24, 0.14), "orb": Color(1.0, 0.7, 0.3)},
	{"name": "GOLD-RAUSCH", "edge": Color(1.0, 0.78, 0.25), "fog": Color(0.3, 0.22, 0.08), "orb": Color(0.5, 0.9, 1.0)},
]

const UPGRADES := [
	{"id": "magnet", "name": "🧲 Magnet", "desc": "Orbs fliegen zu dir"},
	{"id": "schild", "name": "🛡️ Schild", "desc": "+1 Treffer frei"},
	{"id": "dash_cd", "name": "⚡ Turbo-Dash", "desc": "Dash lädt schneller"},
	{"id": "flow", "name": "🌊 Flow-Meister", "desc": "Combo hält länger"},
	{"id": "nearmiss", "name": "🎯 Risiko-Profi", "desc": "Near-Miss-Fenster größer"},
	{"id": "doppel", "name": "✨ Doppel-Orbs", "desc": "Orbs geben mehr Punkte"},
	{"id": "schmal", "name": "📏 Schmaler", "desc": "kleinere Hitbox"},
]

# --- Laufzeit-Zustand ---
var state: int = State.MENU
var rng := RandomNumberGenerator.new()
var daily_mode := false
var day_no := 0
var muted := false

var score := 0
var best := 0
var speed := BASE_SPEED
var speed_growth := 0.45
var target_x := 0.0
var cam_base_x := 0.0
var run_time := 0.0
var spawn_timer := 0.0
var stripe_timer := 0.0

# Combo / Flow
var combo := 0
var combo_timer := 0.0
var combo_time := 3.0
var near_window := 1.3
var orb_value := 1

# Fähigkeiten / Upgrades
var shields := 0
var magnet := false
var hitbox := 1.4
var orbs_collected := 0
var next_upgrade_at := 5

# Dash
var dash_charge := 0.0
var dash_recharge := 0.16
var dash_active := false
var dash_timer := 0.0

# Biome
var biome_index := 0
var phase_timer := PHASE_TIME

# Juice
var shake := 0.0
var pop := 1.0
var target_fov := 72.0

# Pools
var obstacles: Array = []
var orbs: Array = []
var stripes: Array = []

# Nodes
var player: MeshInstance3D
var camera: Camera3D
var env: Environment
var edges: Array = []
var floor_mi: MeshInstance3D
var trail: CPUParticles3D
var score_label: Label
var combo_label: Label
var center_label: Label
var flash: ColorRect
var dash_bg: ColorRect
var dash_fill: ColorRect
var sfx: Dictionary = {}


func _ready() -> void:
	day_no = int(Time.get_unix_time_from_system() / 86400.0)
	_load_best()
	_build_world()
	_build_player()
	_build_hud()
	_load_sfx()
	_apply_biome(0)
	_show_menu()


# ---------------------------------------------------------------- Aufbau
func _build_world() -> void:
	var we := WorldEnvironment.new()
	env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.024, 0.027, 0.059)
	env.fog_enabled = true
	env.fog_density = 0.007
	env.glow_enabled = true
	env.glow_intensity = 1.0
	env.glow_bloom = 0.3
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.25, 0.30, 0.55)
	env.ambient_light_energy = 1.1
	we.environment = env
	add_child(we)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -30, 0)
	sun.light_energy = 1.2
	add_child(sun)

	var fill := OmniLight3D.new()
	fill.light_color = Color(0.37, 0.95, 1.0)
	fill.light_energy = 3.0
	fill.omni_range = 60.0
	fill.position = Vector3(0, 5, 4)
	add_child(fill)

	floor_mi = MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(24, 600)
	floor_mi.mesh = pm
	floor_mi.position = Vector3(0, -1.5, -250)
	floor_mi.material_override = _mat(Color(0.10, 0.12, 0.28), Color(0.05, 0.08, 0.22))
	add_child(floor_mi)

	for side in [-1.0, 1.0]:
		var edge := MeshInstance3D.new()
		var em := BoxMesh.new()
		em.size = Vector3(0.4, 0.5, 600)
		edge.mesh = em
		edge.position = Vector3(side * 9.0, -1.2, -250)
		edge.material_override = _mat(Color(0.37, 0.95, 1.0), Color(0.37, 0.95, 1.0))
		add_child(edge)
		edges.append(edge)

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
	player.material_override = _mat(Color(0.37, 0.95, 1.0), Color(0.10, 0.5, 0.7))
	add_child(player)

	trail = CPUParticles3D.new()
	trail.amount = 48
	trail.lifetime = 0.55
	trail.local_coords = false
	trail.direction = Vector3(0, 0, 1)
	trail.spread = 14.0
	trail.gravity = Vector3.ZERO
	trail.initial_velocity_min = 2.0
	trail.initial_velocity_max = 6.0
	trail.scale_amount_min = 0.18
	trail.scale_amount_max = 0.5
	trail.color = Color(0.37, 0.95, 1.0)
	trail.position = Vector3(0, 0, 1.1)
	var tmesh := SphereMesh.new()
	tmesh.radius = 0.12
	tmesh.height = 0.24
	tmesh.radial_segments = 6
	tmesh.rings = 4
	tmesh.material = _mat(Color(0.37, 0.95, 1.0), Color(0.37, 0.95, 1.0))
	trail.mesh = tmesh
	trail.emitting = false
	player.add_child(trail)


func _build_hud() -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	score_label = Label.new()
	score_label.position = Vector2(22, 16)
	score_label.add_theme_font_size_override("font_size", 28)
	score_label.add_theme_color_override("font_color", Color(0.37, 0.95, 1.0))
	hud.add_child(score_label)

	combo_label = Label.new()
	combo_label.position = Vector2(22, 52)
	combo_label.add_theme_font_size_override("font_size", 34)
	combo_label.add_theme_color_override("font_color", Color(1, 0.78, 0.3))
	hud.add_child(combo_label)

	center_label = Label.new()
	center_label.anchors_preset = Control.PRESET_CENTER
	center_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	center_label.add_theme_font_size_override("font_size", 32)
	center_label.add_theme_color_override("font_color", Color(1, 0.48, 0.85))
	hud.add_child(center_label)

	dash_bg = ColorRect.new()
	dash_bg.color = Color(0.1, 0.12, 0.25, 0.7)
	dash_bg.size = Vector2(220, 14)
	dash_bg.position = Vector2(22, 96)
	hud.add_child(dash_bg)
	dash_fill = ColorRect.new()
	dash_fill.color = Color(1, 0.85, 0.3)
	dash_fill.size = Vector2(0, 14)
	dash_fill.position = Vector2(22, 96)
	hud.add_child(dash_fill)

	flash = ColorRect.new()
	flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	flash.color = Color(1, 1, 1, 0)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.add_child(flash)


func _mat(albedo: Color, emission: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = albedo
	m.emission_enabled = true
	m.emission = emission
	m.emission_energy_multiplier = 1.3
	return m


func _load_sfx() -> void:
	for n in ["shoot", "hit", "hurt", "explode", "pickup", "levelup", "gameover"]:
		var path := "res://assets/sfx/%s.mp3" % n
		if ResourceLoader.exists(path):
			var p := AudioStreamPlayer.new()
			p.stream = load(path)
			add_child(p)
			sfx[n] = p


func _play(n: String) -> void:
	if muted:
		return
	if sfx.has(n):
		sfx[n].play()


# ---------------------------------------------------------------- Speichern
func _load_best() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
		if f:
			best = int(f.get_line())
			f.close()


func _save_best() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_line(str(best))
		f.close()


# ---------------------------------------------------------------- Eingabe (diskret)
func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		var ke: InputEventKey = event
		if not ke.pressed or ke.echo:
			return
		var k: int = ke.keycode
		if k == KEY_M:
			muted = not muted
		match state:
			State.MENU:
				if k == KEY_SPACE or k == KEY_ENTER:
					_start(false)
				elif k == KEY_D:
					_start(true)
			State.PLAY:
				if k == KEY_SPACE or k == KEY_UP:
					_try_dash()
				elif k == KEY_ESCAPE or k == KEY_P:
					_set_pause(true)
			State.PAUSE:
				if k == KEY_ESCAPE or k == KEY_P:
					_set_pause(false)
			State.CHOOSE:
				if k == KEY_1:
					_choose(0)
				elif k == KEY_2:
					_choose(1)
				elif k == KEY_3:
					_choose(2)
			State.DEAD:
				if k == KEY_SPACE or k == KEY_ENTER:
					_show_menu()
	elif event is InputEventScreenTouch:
		var te: InputEventScreenTouch = event
		if not te.pressed:
			return
		match state:
			State.MENU:
				_start(false)
			State.PLAY:
				_try_dash()
			State.DEAD:
				_show_menu()
	elif event is InputEventScreenDrag and state == State.PLAY:
		var de: InputEventScreenDrag = event
		target_x = clamp(target_x + de.relative.x * 0.04, -LANE_LIMIT, LANE_LIMIT)


# ---------------------------------------------------------------- Haupt-Loop
func _process(delta: float) -> void:
	# Flash immer ausblenden, in allen Zuständen.
	flash.color.a = lerp(flash.color.a, 0.0, 0.14)
	if state == State.PLAY:
		_process_play(delta)
	# Kamera-Glättung läuft auch im Menü/Pause weiter (lebendiger Hintergrund).
	shake = max(0.0, shake - delta * 1.5)
	camera.position.x = cam_base_x + (randf() - 0.5) * shake * 2.2
	camera.position.y = 4.5 + (randf() - 0.5) * shake * 2.2
	camera.fov = lerp(camera.fov, target_fov, 0.1)


func _process_play(delta: float) -> void:
	run_time += delta

	# --- Bewegung (gehaltene Tasten) ---
	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		target_x -= MOVE_SPEED * delta
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		target_x += MOVE_SPEED * delta
	target_x = clamp(target_x, -LANE_LIMIT, LANE_LIMIT)
	player.position.x = lerp(player.position.x, target_x, 0.2)
	player.rotation.z = (player.position.x - target_x) * 0.18
	player.position.y = sin(Time.get_ticks_msec() * 0.005) * 0.2
	pop = lerp(pop, 1.0, 0.2)
	player.scale = Vector3.ONE * pop

	# --- Dash ---
	if dash_active:
		dash_timer -= delta
		if dash_timer <= 0.0:
			dash_active = false
	else:
		dash_charge = min(1.0, dash_charge + dash_recharge * delta)

	# --- Geschwindigkeit + Biome ---
	speed += delta * speed_growth
	var cur_speed := speed + (DASH_SPEED_BONUS if dash_active else 0.0)
	target_fov = 70.0 + min(28.0, (cur_speed - BASE_SPEED) * 0.7) + (10.0 if dash_active else 0.0)

	phase_timer -= delta
	if phase_timer <= 0.0:
		phase_timer = PHASE_TIME
		biome_index += 1
		_apply_biome(biome_index)
		speed_growth += 0.08
		_announce("» %s «" % _biome()["name"], _biome()["edge"])
		_play("levelup")

	# --- Spawnen ---
	spawn_timer -= delta
	if spawn_timer <= 0.0:
		_spawn()
		spawn_timer = max(0.4, 1.15 - run_time * 0.012)
	stripe_timer -= delta
	if stripe_timer <= 0.0:
		_spawn_stripe()
		stripe_timer = 0.25

	# --- Combo-Verfall ---
	if combo > 0:
		combo_timer -= delta
		if combo_timer <= 0.0:
			combo = 0

	_update_obstacles(cur_speed, delta)
	_update_orbs(cur_speed, delta)
	_update_stripes(cur_speed, delta)

	cam_base_x = lerp(cam_base_x, player.position.x * 0.42, 0.08)
	_update_hud()


# ---------------------------------------------------------------- Welt-Objekte
func _spawn() -> void:
	var gap := rng.randf_range(-3.5, 3.5)
	var difficulty := 1.0 + run_time * 0.02
	for i in 2:
		var ob := MeshInstance3D.new()
		var h := rng.randf_range(2.0, 6.0)
		var bm := BoxMesh.new()
		bm.size = Vector3(1.6, h, 1.6)
		ob.mesh = bm
		var col: Color = _biome()["edge"].lerp(Color.from_hsv(rng.randf(), 0.7, 1.0), 0.5)
		ob.material_override = _mat(col * 0.3, col)
		ob.position = Vector3(gap + (-4.0 if i == 0 else 4.0) + rng.randf_range(-1.0, 1.0), h * 0.5 - 1.5, -200)
		add_child(ob)
		obstacles.append(ob)
	# Gelegentlich ein drittes Hindernis bei höherer Schwierigkeit (engere Lücken).
	if difficulty > 1.6 and rng.randf() < 0.3:
		var ob2 := MeshInstance3D.new()
		var h2 := rng.randf_range(2.0, 5.0)
		var bm2 := BoxMesh.new()
		bm2.size = Vector3(1.6, h2, 1.6)
		ob2.mesh = bm2
		var c2: Color = _biome()["edge"]
		ob2.material_override = _mat(c2 * 0.3, c2)
		ob2.position = Vector3(gap + rng.randf_range(-2.0, 2.0), h2 * 0.5 - 1.5, -210)
		add_child(ob2)
		obstacles.append(ob2)
	if rng.randf() < 0.85:
		var orb := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.6
		sm.height = 1.2
		orb.mesh = sm
		var oc: Color = _biome()["orb"]
		orb.material_override = _mat(oc, oc)
		orb.position = Vector3(gap + rng.randf_range(-1.0, 1.0), 0, -206)
		add_child(orb)
		orbs.append(orb)


func _spawn_stripe() -> void:
	var s := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(18, 0.05, 0.4)
	s.mesh = bm
	var c: Color = _biome()["edge"] * 0.6
	s.material_override = _mat(c, c)
	s.position = Vector3(0, -1.48, -200)
	add_child(s)
	stripes.append(s)


func _update_obstacles(cur_speed: float, delta: float) -> void:
	for ob in obstacles.duplicate():
		ob.position.z += cur_speed * delta
		ob.rotate_y(delta)
		# Near-Miss: Hindernis passiert die Spieler-Ebene knapp daneben → Combo + Flow.
		if not ob.has_meta("scored") and ob.position.z > 1.0 and ob.position.z < 12.0:
			var dx: float = abs(ob.position.x - player.position.x)
			if dx > hitbox and dx < hitbox + near_window:
				ob.set_meta("scored", true)
				_register_near_miss()
			elif dash_active and dx < hitbox + near_window:
				ob.set_meta("scored", true)
				_register_near_miss()
		if ob.position.z > 14.0:
			obstacles.erase(ob)
			ob.queue_free()
		elif abs(ob.position.z) < 1.6 and abs(ob.position.x - player.position.x) < hitbox:
			if dash_active:
				pass  # Dash macht unverwundbar
			elif shields > 0:
				shields -= 1
				shake = 0.5
				_flash(Color(0.4, 0.8, 1.0), 0.4)
				_play("hurt")
				obstacles.erase(ob)
				ob.queue_free()
			else:
				obstacles.erase(ob)
				ob.queue_free()
				_die()
				return


func _update_orbs(cur_speed: float, delta: float) -> void:
	for orb in orbs.duplicate():
		orb.position.z += cur_speed * delta
		orb.rotate_y(delta * 3.0)
		if magnet and orb.position.z > -30.0:
			orb.position.x = lerp(orb.position.x, player.position.x, 0.08)
		if orb.position.z > 14.0:
			orbs.erase(orb)
			orb.queue_free()
		elif abs(orb.position.z) < 1.5 and abs(orb.position.x - player.position.x) < 1.6:
			var pos: Vector3 = orb.position
			orbs.erase(orb)
			orb.queue_free()
			_collect_orb(pos)


func _update_stripes(cur_speed: float, delta: float) -> void:
	for s in stripes.duplicate():
		s.position.z += cur_speed * delta
		if s.position.z > 14.0:
			stripes.erase(s)
			s.queue_free()


# ---------------------------------------------------------------- Combo / Belohnung
func _mult() -> int:
	return min(MULT_CAP, 1 + int(combo / float(COMBO_PER_MULT)))


func _register_near_miss() -> void:
	combo += 1
	combo_timer = combo_time
	score += _mult()
	shake = max(shake, 0.16)
	target_fov += 2.0
	_play("hit")


func _collect_orb(pos: Vector3) -> void:
	combo += 1
	combo_timer = combo_time
	orbs_collected += 1
	score += orb_value * _mult()
	dash_charge = min(1.0, dash_charge + 0.34)
	pop = 1.5
	shake = max(shake, 0.12)
	_burst(pos, _biome()["orb"], 16, 7.0)
	_play("pickup")
	if orbs_collected >= next_upgrade_at:
		next_upgrade_at += 6
		_offer_upgrade()


func _try_dash() -> void:
	if dash_active or dash_charge < 1.0:
		return
	dash_active = true
	dash_timer = DASH_TIME
	dash_charge = 0.0
	pop = 1.6
	shake = max(shake, 0.2)
	target_fov += 12.0
	_flash(_biome()["edge"], 0.3)
	_burst(player.position + Vector3(0, 0, 1.0), _biome()["edge"], 24, 9.0)
	_play("shoot")


# ---------------------------------------------------------------- Biome
func _biome() -> Dictionary:
	return BIOMES[biome_index % BIOMES.size()]


func _apply_biome(idx: int) -> void:
	biome_index = idx
	var b := _biome()
	env.fog_light_color = b["fog"]
	for e in edges:
		e.material_override = _mat(b["edge"], b["edge"])
	if trail:
		trail.color = b["edge"]


# ---------------------------------------------------------------- Upgrades
func _offer_upgrade() -> void:
	state = State.CHOOSE
	trail.emitting = false
	var pool := UPGRADES.duplicate()
	pool.shuffle()
	pool = pool.slice(0, 3)
	set_meta("choices", pool)
	var t := "⬆  UPGRADE — wähle (1 / 2 / 3):\n\n"
	for i in pool.size():
		t += "[%d]  %s\n      %s\n\n" % [i + 1, pool[i]["name"], pool[i]["desc"]]
	center_label.text = t
	_play("levelup")


func _choose(i: int) -> void:
	var pool: Array = get_meta("choices", [])
	if i < 0 or i >= pool.size():
		return
	_apply_upgrade(String(pool[i]["id"]))
	center_label.text = ""
	state = State.PLAY
	trail.emitting = true


func _apply_upgrade(id: String) -> void:
	match id:
		"magnet":
			magnet = true
		"schild":
			shields += 1
		"dash_cd":
			dash_recharge = min(0.5, dash_recharge + 0.08)
		"flow":
			combo_time += 1.0
		"nearmiss":
			near_window += 0.6
		"doppel":
			orb_value += 1
		"schmal":
			hitbox = max(0.85, hitbox - 0.3)


# ---------------------------------------------------------------- Juice
func _flash(c: Color, a: float) -> void:
	flash.color = Color(c.r, c.g, c.b, a)


func _announce(txt: String, c: Color) -> void:
	center_label.add_theme_color_override("font_color", c)
	center_label.text = txt
	var tw := create_tween()
	tw.tween_interval(1.1)
	tw.tween_callback(_clear_announce)


func _clear_announce() -> void:
	if state == State.PLAY:
		center_label.text = ""


func _burst(pos: Vector3, color: Color, amount: int, vel: float) -> void:
	var p := CPUParticles3D.new()
	p.position = pos
	p.one_shot = true
	p.explosiveness = 1.0
	p.amount = amount
	p.lifetime = 0.6
	p.direction = Vector3(0, 1, 0)
	p.spread = 180.0
	p.gravity = Vector3(0, -9.0, 0)
	p.initial_velocity_min = vel * 0.5
	p.initial_velocity_max = vel
	p.scale_amount_min = 0.15
	p.scale_amount_max = 0.4
	p.color = color
	var sm := SphereMesh.new()
	sm.radius = 0.12
	sm.height = 0.24
	sm.radial_segments = 6
	sm.rings = 4
	sm.material = _mat(color, color)
	p.mesh = sm
	add_child(p)
	p.emitting = true
	var tm := get_tree().create_timer(1.0)
	tm.timeout.connect(p.queue_free)


# ---------------------------------------------------------------- HUD
func _update_hud() -> void:
	var ups := ""
	if shields > 0:
		ups += "🛡%d " % shields
	if magnet:
		ups += "🧲 "
	score_label.text = "Punkte: %d    Rekord: %d    %s" % [score, best, ups]
	if combo > 0:
		combo_label.text = "COMBO %d   ×%d" % [combo, _mult()]
		var heat: float = clamp(combo / 30.0, 0.0, 1.0)
		combo_label.add_theme_color_override("font_color", Color(1, 1, 1).lerp(Color(1, 0.3, 0.5), heat))
	else:
		combo_label.text = ""
	dash_fill.size.x = 220.0 * dash_charge
	dash_fill.color = Color(0.4, 0.5, 0.6) if dash_charge < 1.0 else Color(1, 0.85, 0.3)


# ---------------------------------------------------------------- Zustände
func _show_menu() -> void:
	_clear_world()
	state = State.MENU
	trail.emitting = false
	score_label.text = ""
	combo_label.text = ""
	dash_fill.size.x = 0
	target_fov = 72.0
	center_label.add_theme_color_override("font_color", Color(0.37, 0.95, 1.0))
	center_label.text = "NEON DRIFT\n\nWeiche aus, sammle Orbs, halte die COMBO.\nNear-Miss = Risiko = mehr Punkte.\n\n[LEER] Start    [D] Tages-Challenge #%d\n[← →] bewegen   [LEER] Dash   [M] Ton\n\nRekord: %d" % [day_no, best]


func _start(daily: bool) -> void:
	_clear_world()
	daily_mode = daily
	if daily:
		rng.seed = day_no
	else:
		rng.randomize()
	score = 0
	speed = BASE_SPEED
	speed_growth = 0.45
	target_x = 0.0
	cam_base_x = 0.0
	run_time = 0.0
	spawn_timer = 0.0
	stripe_timer = 0.0
	combo = 0
	combo_timer = 0.0
	combo_time = 3.0
	near_window = 1.3
	orb_value = 1
	shields = 0
	magnet = false
	hitbox = 1.4
	orbs_collected = 0
	next_upgrade_at = 5
	dash_charge = 0.0
	dash_recharge = 0.16
	dash_active = false
	dash_timer = 0.0
	phase_timer = PHASE_TIME
	pop = 1.0
	shake = 0.0
	player.position = Vector3.ZERO
	player.scale = Vector3.ONE
	_apply_biome(0)
	center_label.text = ""
	trail.emitting = true
	state = State.PLAY
	_announce("» %s «" % _biome()["name"], _biome()["edge"])


func _set_pause(on: bool) -> void:
	if on:
		state = State.PAUSE
		trail.emitting = false
		center_label.add_theme_color_override("font_color", Color(0.37, 0.95, 1.0))
		center_label.text = "⏸ PAUSE\n\n[ESC] weiter\n[M] Ton: %s" % ("AUS" if muted else "AN")
	else:
		state = State.PLAY
		trail.emitting = true
		center_label.text = ""


func _die() -> void:
	state = State.DEAD
	trail.emitting = false
	shake = 0.7
	target_fov = 80.0
	_flash(Color(1, 0.3, 0.4), 0.6)
	_burst(player.position, Color(1, 0.4, 0.5), 40, 12.0)
	_play("explode")
	_play("gameover")
	var rec := false
	if score > best:
		best = score
		rec = true
		_save_best()
	var head := "🏆 NEUER REKORD!" if rec else "GAME OVER"
	var tag := ("Tages-Challenge #%d\n" % day_no) if daily_mode else ""
	center_label.add_theme_color_override("font_color", Color(1, 0.48, 0.85))
	center_label.text = "%s\n%sPunkte: %d   Rekord: %d\n\n[LEER] zurück zum Menü" % [head, tag, score, best]


func _clear_world() -> void:
	for ob in obstacles:
		ob.queue_free()
	for orb in orbs:
		orb.queue_free()
	for s in stripes:
		s.queue_free()
	obstacles.clear()
	orbs.clear()
	stripes.clear()
