/** Three.js scene for GlobeCard — mount and dispose. */
import * as THREE from 'three';
import { isLand } from './globe-card-land';

export type GlobePerson = {
	name: string;
	city: string;
	lat: number;
	lon: number;
	color: string;
};

export type GlobeSettings = {
	getTurn: () => number;
	getArcs: () => number;
	getStill: () => boolean;
	getPeople: () => GlobePerson[];
};

const DRAW = 1.4;
const HOLD = 1.8;
const FADE = 0.9;
const LIFE = DRAW + HOLD + FADE;
const SEGMENTS = 80;

function toVec(lat: number, lon: number, r = 1) {
	const phi = (lat * Math.PI) / 180;
	const lam = (lon * Math.PI) / 180;
	return new THREE.Vector3(
		r * Math.cos(phi) * Math.sin(lam),
		r * Math.sin(phi),
		r * Math.cos(phi) * Math.cos(lam)
	);
}

function initials(name: string) {
	return name
		.split(/\s+/)
		.map((p) => p[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	draw(c.getContext('2d')!);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

type Flight = {
	line: THREE.Line;
	comet: THREE.Sprite;
	heads: THREE.Sprite[];
	rings: THREE.Mesh[];
	path: THREE.Vector3[];
	born: number;
};

export function mountGlobe(host: HTMLElement, settings: GlobeSettings): () => void {
	const pointer = {
		x: 0,
		y: 0,
		inside: false,
		dragging: false,
		lastX: 0,
		lastY: 0,
		lastT: 0,
		vx: 0,
		vy: 0
	};

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	host.appendChild(renderer.domElement);
	renderer.domElement.style.display = 'block';

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
	camera.position.set(0, 0, 4.4);

	const pivot = new THREE.Group();
	pivot.position.set(0, -1.32, 0);
	scene.add(pivot);
	const tilt = new THREE.Group();
	tilt.rotation.x = 0.38;
	pivot.add(tilt);
	const globe = new THREE.Group();
	globe.rotation.y = -0.25;
	tilt.add(globe);

	scene.add(new THREE.AmbientLight(0xffffff, 2.3));
	const sun = new THREE.DirectionalLight(0xffffff, 1.1);
	sun.position.set(-2.5, 3, 4);
	scene.add(sun);

	const glowTexture = (color: string, inner = 0) =>
		canvasTexture(128, 128, (g) => {
			const grad = g.createRadialGradient(64, 64, 64 * inner, 64, 64, 64);
			grad.addColorStop(0, color);
			grad.addColorStop(1, 'rgba(255,255,255,0)');
			g.fillStyle = grad;
			g.fillRect(0, 0, 128, 128);
		});

	const haloTex = glowTexture('rgba(145, 80, 224, 0.16)', 0.62);
	const halo = new THREE.Sprite(
		new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false })
	);
	halo.scale.set(2.6, 2.6, 1);
	halo.renderOrder = -1;
	pivot.add(halo);

	const sphere = new THREE.Mesh(
		new THREE.SphereGeometry(0.992, 80, 80),
		new THREE.MeshLambertMaterial({ color: 0xf0f0ef })
	);
	globe.add(sphere);

	const pts: number[] = [];
	const N = 22000;
	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < N; i++) {
		const y = 1 - (i / (N - 1)) * 2;
		const rad = Math.sqrt(1 - y * y);
		const th = golden * i;
		const x = Math.cos(th) * rad;
		const z = Math.sin(th) * rad;
		const lat = (Math.asin(y) * 180) / Math.PI;
		const lon = (Math.atan2(x, z) * 180) / Math.PI;
		if (isLand(lat, lon)) pts.push(x * 1.001, y * 1.001, z * 1.001);
	}
	const dotsGeo = new THREE.BufferGeometry();
	dotsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
	const dotTex = canvasTexture(64, 64, (g) => {
		g.fillStyle = '#fff';
		g.beginPath();
		g.arc(32, 32, 26, 0, Math.PI * 2);
		g.fill();
	});
	const dots = new THREE.Points(
		dotsGeo,
		new THREE.PointsMaterial({
			color: 0xa9a9a5,
			size: 0.02,
			map: dotTex,
			transparent: true,
			alphaTest: 0.4,
			sizeAttenuation: true
		})
	);
	globe.add(dots);

	const people0 = settings.getPeople();
	const cityPos: number[] = [];
	const cityCol: number[] = [];
	for (const m of people0) {
		const v = toVec(m.lat, m.lon, 1.004);
		cityPos.push(v.x, v.y, v.z);
		const c = new THREE.Color(m.color);
		cityCol.push(c.r, c.g, c.b);
	}
	const cityGeo = new THREE.BufferGeometry();
	cityGeo.setAttribute('position', new THREE.Float32BufferAttribute(cityPos, 3));
	cityGeo.setAttribute('color', new THREE.Float32BufferAttribute(cityCol, 3));
	const cities = new THREE.Points(
		cityGeo,
		new THREE.PointsMaterial({
			size: 0.045,
			map: dotTex,
			vertexColors: true,
			transparent: true,
			alphaTest: 0.4,
			sizeAttenuation: true
		})
	);
	globe.add(cities);

	const textures = new Map<string, THREE.Texture>();
	const tex = (key: string, make: () => THREE.Texture) => {
		if (!textures.has(key)) textures.set(key, make());
		return textures.get(key)!;
	};

	const avatarTexture = (name: string, color: string) =>
		canvasTexture(128, 128, (g) => {
			g.shadowColor = 'rgba(0,0,0,0.22)';
			g.shadowBlur = 12;
			g.shadowOffsetY = 4;
			g.fillStyle = '#fff';
			g.beginPath();
			g.arc(64, 60, 46, 0, Math.PI * 2);
			g.fill();
			g.shadowColor = 'transparent';
			g.fillStyle = color;
			g.beginPath();
			g.arc(64, 60, 39, 0, Math.PI * 2);
			g.fill();
			g.fillStyle = '#fff';
			g.font = '600 32px ui-sans-serif, system-ui, -apple-system, sans-serif';
			g.textAlign = 'center';
			g.textBaseline = 'middle';
			g.fillText(initials(name), 64, 62);
		});

	const flights: Flight[] = [];
	const launch = (now: number, settled = false) => {
		const list = settings.getPeople();
		if (list.length < 2) return;
		const a = list[Math.floor(Math.random() * list.length)]!;
		let b = a;
		while (b === a) b = list[Math.floor(Math.random() * list.length)]!;
		const va = toVec(a.lat, a.lon);
		const vb = toVec(b.lat, b.lon);
		const angle = va.angleTo(vb);
		const lift = 0.1 + 0.42 * (angle / Math.PI);
		const s = Math.max(1e-4, Math.sin(angle));
		const path: THREE.Vector3[] = [];
		for (let i = 0; i <= SEGMENTS; i++) {
			const t = i / SEGMENTS;
			const q = va
				.clone()
				.multiplyScalar(Math.sin((1 - t) * angle) / s)
				.add(vb.clone().multiplyScalar(Math.sin(t * angle) / s))
				.normalize()
				.multiplyScalar(1.004 + lift * Math.sin(Math.PI * t));
			path.push(q);
		}
		const geo = new THREE.BufferGeometry().setFromPoints(path);
		geo.setDrawRange(0, settled ? path.length : 0);
		const line = new THREE.Line(
			geo,
			new THREE.LineBasicMaterial({ color: b.color, transparent: true, opacity: 0.85 })
		);
		globe.add(line);
		const comet = new THREE.Sprite(
			new THREE.SpriteMaterial({
				map: tex('glow' + b.color, () => glowTexture(b.color, 0.05)),
				transparent: true,
				depthWrite: false
			})
		);
		comet.scale.set(0.16, 0.16, 1);
		comet.visible = false;
		globe.add(comet);
		const heads: THREE.Sprite[] = [];
		const rings: THREE.Mesh[] = [];
		for (const [m, v] of [
			[a, va],
			[b, vb]
		] as const) {
			const sprite = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: tex('av' + m.name, () => avatarTexture(m.name, m.color)),
					transparent: true,
					depthWrite: false
				})
			);
			sprite.center.set(0.5, 0.1);
			sprite.position.copy(v).multiplyScalar(1.006);
			sprite.scale.set(0, 0, 1);
			globe.add(sprite);
			heads.push(sprite);
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(0.022, 0.03, 40),
				new THREE.MeshBasicMaterial({
					color: m.color,
					transparent: true,
					opacity: 0,
					side: THREE.DoubleSide,
					depthWrite: false
				})
			);
			ring.position.copy(v).multiplyScalar(1.005);
			ring.lookAt(v.clone().multiplyScalar(2));
			globe.add(ring);
			rings.push(ring);
		}
		flights.push({ line, comet, heads, rings, path, born: settled ? now - DRAW - 0.4 : now });
	};

	const drop = (f: Flight) => {
		globe.remove(f.line, f.comet, ...f.heads, ...f.rings);
		f.line.geometry.dispose();
		(f.line.material as THREE.Material).dispose();
		f.comet.material.dispose();
		f.heads.forEach((h) => h.material.dispose());
		f.rings.forEach((r) => {
			r.geometry.dispose();
			(r.material as THREE.Material).dispose();
		});
	};

	const size = { w: 0, h: 0 };
	const resize = () => {
		size.w = host.clientWidth;
		size.h = host.clientHeight;
		renderer.setSize(size.w, size.h, false);
		renderer.domElement.style.width = '100%';
		renderer.domElement.style.height = '100%';
		camera.aspect = size.w / Math.max(1, size.h);
		camera.updateProjectionMatrix();
	};
	resize();
	const ro = new ResizeObserver(resize);
	ro.observe(host);

	let visible = true;
	const io = new IntersectionObserver(([e]) => {
		visible = !!e?.isIntersecting;
	});
	io.observe(host);

	if (settings.getStill()) for (let i = 0; i < settings.getArcs(); i++) launch(0, true);

	let last = performance.now();
	let elapsed = 0;
	let nextLaunch = 0.3;
	let raf = 0;
	const easeOut = (t: number) => 1 - (1 - t) ** 3;

	const frame = () => {
		raf = requestAnimationFrame(frame);
		const t = performance.now();
		const dt = Math.min(0.05, (t - last) / 1000);
		last = t;
		if (!visible || !size.w) return;
		elapsed += dt;
		const now = elapsed;
		const still = settings.getStill();
		const turn = settings.getTurn();
		const arcs = settings.getArcs();
		const p = pointer;

		if (!still) {
			const base = turn > 0 ? (Math.PI * 2) / turn : 0;
			if (!p.dragging) {
				p.vx *= Math.exp(-dt * 2.2);
				p.vy *= Math.exp(-dt * 3);
			}
			globe.rotation.y += (base + p.vx) * dt;
			tilt.rotation.x = Math.max(0, Math.min(0.9, tilt.rotation.x + p.vy * dt));
			const lean = p.inside && !p.dragging ? 1 : 0;
			pivot.rotation.y += (p.x * 0.28 * lean - pivot.rotation.y) * Math.min(1, dt * 4);
			pivot.rotation.x += (p.y * 0.14 * lean - pivot.rotation.x) * Math.min(1, dt * 4);
			if (now >= nextLaunch && flights.length < arcs) {
				launch(now);
				nextLaunch = now + LIFE / Math.max(1, arcs) + Math.random() * 0.25;
			}
		}

		for (let i = flights.length - 1; i >= 0; i--) {
			const f = flights[i]!;
			const age = still ? DRAW + 0.4 : now - f.born;
			const n = f.path.length;
			const geo = f.line.geometry;
			let head = n - 1;
			if (age < DRAW) {
				head = Math.max(1, Math.floor(easeOut(age / DRAW) * (n - 1)));
				geo.setDrawRange(0, head + 1);
			} else if (age < DRAW + HOLD) geo.setDrawRange(0, n);
			else {
				const k = Math.min(1, (age - DRAW - HOLD) / FADE);
				const start = Math.floor(easeOut(k) * n);
				geo.setDrawRange(start, n - start);
			}
			f.comet.visible = !still && age < DRAW + 0.15;
			if (f.comet.visible) {
				f.comet.position.copy(f.path[Math.min(head, n - 1)]!);
				(f.comet.material as THREE.SpriteMaterial).opacity =
					age < DRAW ? 1 : 1 - (age - DRAW) / 0.15;
			}
			const fade = age > DRAW + HOLD ? 1 - Math.min(1, (age - DRAW - HOLD) / FADE) : 1;
			f.heads.forEach((h, j) => {
				const at = j === 0 ? 0 : DRAW * 0.94;
				const k = Math.max(0, Math.min(1, (age - at) / 0.4));
				const pop = 1 + Math.sin(k * Math.PI) * 0.3 * (1 - k);
				const sc = 0.13 * Math.min(1, k * 1.8) * pop * fade;
				h.scale.set(sc, sc, 1);
				(h.material as THREE.SpriteMaterial).opacity = fade;
			});
			f.rings.forEach((r, j) => {
				const at = j === 0 ? 0 : DRAW * 0.94;
				const k = (age - at) / 1.1;
				const m = r.material as THREE.MeshBasicMaterial;
				if (k < 0 || k > 1 || still) {
					m.opacity = 0;
					return;
				}
				r.scale.setScalar(1 + k * 3.4);
				m.opacity = (1 - k) * 0.55 * fade;
			});
			if (!still && age >= LIFE) {
				drop(f);
				flights.splice(i, 1);
			}
		}
		renderer.render(scene, camera);
	};
	frame();

	const local = (e: PointerEvent) => {
		const r = host.getBoundingClientRect();
		return {
			x: ((e.clientX - r.left) / r.width) * 2 - 1,
			y: ((e.clientY - r.top) / r.height) * 2 - 1
		};
	};
	const onEnter = () => {
		pointer.inside = true;
	};
	const onLeave = () => Object.assign(pointer, { inside: false, x: 0, y: 0 });
	const onDown = (e: PointerEvent) => {
		if (settings.getStill()) return;
		Object.assign(pointer, {
			dragging: true,
			lastX: e.clientX,
			lastY: e.clientY,
			lastT: performance.now()
		});
		host.setPointerCapture(e.pointerId);
	};
	const onMove = (e: PointerEvent) => {
		Object.assign(pointer, local(e));
		if (!pointer.dragging) return;
		const now = performance.now();
		const dts = Math.max(1, now - pointer.lastT) / 1000;
		const dx = (e.clientX - pointer.lastX) * 0.008;
		const dy = (e.clientY - pointer.lastY) * 0.006;
		globe.rotation.y += dx;
		tilt.rotation.x = Math.max(0, Math.min(0.9, tilt.rotation.x + dy));
		pointer.vx = pointer.vx * 0.5 + (dx / dts) * 0.5;
		pointer.vy = pointer.vy * 0.5 + (dy / dts) * 0.5;
		Object.assign(pointer, { lastX: e.clientX, lastY: e.clientY, lastT: now });
	};
	const onUp = () => {
		pointer.dragging = false;
		pointer.vx = Math.max(-6, Math.min(6, pointer.vx));
		pointer.vy = Math.max(-2, Math.min(2, pointer.vy));
	};
	host.addEventListener('pointerenter', onEnter);
	host.addEventListener('pointerleave', onLeave);
	host.addEventListener('pointerdown', onDown);
	host.addEventListener('pointermove', onMove);
	host.addEventListener('pointerup', onUp);
	host.addEventListener('pointercancel', onUp);

	return () => {
		cancelAnimationFrame(raf);
		ro.disconnect();
		io.disconnect();
		host.removeEventListener('pointerenter', onEnter);
		host.removeEventListener('pointerleave', onLeave);
		host.removeEventListener('pointerdown', onDown);
		host.removeEventListener('pointermove', onMove);
		host.removeEventListener('pointerup', onUp);
		host.removeEventListener('pointercancel', onUp);
		flights.forEach(drop);
		sphere.geometry.dispose();
		(sphere.material as THREE.Material).dispose();
		dotsGeo.dispose();
		(dots.material as THREE.Material).dispose();
		cityGeo.dispose();
		(cities.material as THREE.Material).dispose();
		halo.material.dispose();
		haloTex.dispose();
		dotTex.dispose();
		textures.forEach((x) => x.dispose());
		renderer.dispose();
		renderer.domElement.remove();
	};
}
