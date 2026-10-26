import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { isSurfaceClick, viewForPoint } from './injuryDomain.js'

function disposeTree(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set()
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material) continue
      materials.add(material)
      Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value) })
    }
  })
  geometries.forEach(item => item.dispose())
  materials.forEach(item => item.dispose())
  textures.forEach(item => { item.source?.data?.close?.(); item.dispose() })
}

// Coordinates belong to the unscaled glTF scene, never to the viewport or camera.
export function createHorseScene({ host, url, getMarkers, onPick, onState, onOrbit, onFrame }) {
  const scene = new THREE.Scene()
  const modelSpace = new THREE.Group()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 1000)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.setAttribute('aria-label', 'Mô hình ngựa 3D. Kéo để xoay, cuộn để phóng to.')
  renderer.domElement.setAttribute('role', 'img')
  host.prepend(renderer.domElement)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false
  controls.minPolarAngle = 0.08
  controls.maxPolarAngle = Math.PI - 0.08
  scene.add(modelSpace, new THREE.HemisphereLight(0xffffff, 0xaaa797, 2.4))
  const light = new THREE.DirectionalLight(0xffffff, 3)
  light.position.set(3, 6, 4)
  scene.add(light)
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let disposed = false, loaded = false, radius = 1, start = null
  let activePointers = new Set()
  const center = new THREE.Vector3()
  const neutral = new THREE.MeshStandardMaterial({ color: 0xb9b7ac, roughness: 0.86, metalness: 0 })
  const originals = new Set()

  function render() {
    if (disposed || !loaded) return
    scene.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    renderer.render(scene, camera)
    for (const { marker, element } of getMarkers()) {
      if (!element) continue
      const world = modelSpace.localToWorld(new THREE.Vector3(marker.point.x, marker.point.y, marker.point.z))
      const projected = world.clone().project(camera)
      const direction = world.clone().sub(camera.position)
      const distance = direction.length()
      raycaster.set(camera.position, direction.normalize())
      const obstruction = raycaster.intersectObject(modelSpace, true)[0]
      const visible = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 &&
        (!obstruction || obstruction.distance >= distance - radius * 0.012)
      element.hidden = !visible
      element.style.left = `${(projected.x + 1) * 50}%`
      element.style.top = `${(1 - projected.y) * 50}%`
    }
  }
  function frame(preset = 'left') {
    if (!loaded) return
    const views = { left: [0, 0.18, 1], right: [0, 0.18, -1], front: [1, 0.18, 0], back: [-1, 0.18, 0], reset: [0.65, 0.35, 1] }
    const vector = new THREE.Vector3(...(views[preset] || views.reset)).normalize()
    // Frame the entire horse for both wide and narrow canvases.
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2)
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect)
    const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.12
    controls.target.copy(center)
    camera.position.copy(center).addScaledVector(vector, distance)
    controls.minDistance = radius * 0.45
    controls.maxDistance = distance * 3
    camera.near = radius / 1000
    camera.far = distance * 20
    camera.updateProjectionMatrix()
    controls.update()
    render()
    onFrame(preset)
  }
  function resize() {
    const width = host.clientWidth, height = host.clientHeight
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    render()
  }
  function pointerDown(event) {
    activePointers.add(event.pointerId)
    if (activePointers.size > 1) { if (start) start.dragged = true; return }
    start = event.button === 0 ? { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, dragged: false } : null
  }
  function pointerMove(event) {
    if (start && Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 5) start.dragged = true
  }
  function pointerUp(event) {
    activePointers.delete(event.pointerId)
    const click = isSurfaceClick(start, event)
    start = null
    if (!click || !loaded || event.ctrlKey || event.metaKey || event.shiftKey) return
    const bounds = renderer.domElement.getBoundingClientRect()
    ndc.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObject(modelSpace, true)[0]
    if (hit) {
      const point = modelSpace.worldToLocal(hit.point.clone())
      onPick({ x: point.x, y: point.y, z: point.z }, viewForPoint(camera.position.clone().sub(center)))
    }
  }
  const cancel = () => { start = null; activePointers.clear() }
  const orbit = () => onOrbit()
  const lost = event => { event.preventDefault(); onState('error') }
  renderer.domElement.addEventListener('pointerdown', pointerDown)
  renderer.domElement.addEventListener('pointermove', pointerMove)
  renderer.domElement.addEventListener('pointerup', pointerUp)
  renderer.domElement.addEventListener('pointercancel', cancel)
  renderer.domElement.addEventListener('webglcontextlost', lost)
  controls.addEventListener('change', render)
  controls.addEventListener('start', orbit)
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  onState('loading')
  new GLTFLoader().loadAsync(url).then(gltf => {
    if (disposed) { disposeTree(gltf.scene); return }
    gltf.scene.traverse(node => {
      if (node.isMesh) {
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) originals.add(material)
        node.material = neutral
      }
    })
    modelSpace.add(gltf.scene)
    const bounds = new THREE.Box3().setFromObject(modelSpace)
    const sphere = bounds.getBoundingSphere(new THREE.Sphere())
    if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error('Empty model')
    center.copy(sphere.center)
    radius = sphere.radius
    loaded = true
    frame('reset')
    onState('ready')
  }).catch(() => { if (!disposed) onState('error') })

  return {
    frame, render,
    dispose() {
      disposed = true
      observer.disconnect()
      controls.removeEventListener('change', render)
      controls.removeEventListener('start', orbit)
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', cancel)
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      disposeTree(scene)
      // Replaced source materials may own image bitmaps/textures.
      const source = new THREE.Group()
      originals.forEach(material => { const node = new THREE.Object3D(); node.material = material; source.add(node) })
      disposeTree(source)
      neutral.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
