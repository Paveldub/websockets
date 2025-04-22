import {
    Scene,
    AnimationAction,
    AnimationMixer,
    AnimationUtils,
    DirectionalLight,
    Mesh,
    PerspectiveCamera,
    Object3D,
    WebGLRenderer,
    Group,
    Vector3,
    BoxGeometry,
    MeshStandardMaterial,
    Euler,
    Quaternion,
    Matrix4,
    GridHelper,
    TextureLoader,
    EquirectangularReflectionMapping,
    AnimationClip
  } from 'three'
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
  import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
  import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js'
  import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
  import RAPIER, {
    ActiveEvents,
    ColliderDesc,
    RigidBody,
    RigidBodyDesc,
    World,
    EventQueue
  } from '@dimforge/rapier3d-compat'
  import { io } from 'socket.io-client'
  
  class Keyboard {
    keyMap: { [key: string]: boolean } = {}
  
    constructor(renderer: WebGLRenderer) {
      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === renderer.domElement) {
          document.addEventListener('keydown', this.onDocumentKey)
          document.addEventListener('keyup', this.onDocumentKey)
        } else {
          document.removeEventListener('keydown', this.onDocumentKey)
          document.removeEventListener('keyup', this.onDocumentKey)
        }
      })
    }
  
    onDocumentKey = (e: KeyboardEvent) => {
      this.keyMap[e.code] = e.type === 'keydown'
    }
  }
  
  class Eve extends Group {
    mixer?: AnimationMixer
    glTFLoader: GLTFLoader
  
    animations: AnimationClip[] = []
  
    constructor() {
      super()
  
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
  
      this.glTFLoader = new GLTFLoader()
      this.glTFLoader.setDRACOLoader(dracoLoader)
    }
  
    async init(animationActions: { [key: string]: AnimationAction }) {
    const [eve, idle, jump, pose] = await Promise.all([
      this.glTFLoader.loadAsync('models/eve$@walk_compressed.glb'),
      this.glTFLoader.loadAsync('models/eve@idle.glb'),
      this.glTFLoader.loadAsync('models/eve@jump.glb'),
      this.glTFLoader.loadAsync('models/eve@pose.glb')
    ])
      this.animations.push(
        idle.animations[0],
        eve.animations[0],
        jump.animations[0],
        pose.animations[0]
      )
  
      eve.scene.traverse((m) => {
        if ((m as Mesh).isMesh) {
          m.castShadow = true
        }
      })
  
      this.mixer = new AnimationMixer(eve.scene)
      animationActions['idle'] = this.mixer.clipAction(idle.animations[0])
      animationActions['walk'] = this.mixer.clipAction(
        AnimationUtils.subclip(eve.animations[0], 'walk', 0, 42)
      )
      jump.animations[0].tracks = jump.animations[0].tracks.filter(function (e) {
        return !e.name.endsWith('.position')
      })
      animationActions['jump'] = this.mixer.clipAction(jump.animations[0])
      animationActions['pose'] = this.mixer.clipAction(pose.animations[0])
  
      animationActions['idle'].play()
  
      this.add(eve.scene)
    }
  
    update(delta: number) {
      this.mixer?.update(delta)
    }
  }
  
  class AnimationController {
    scene: Scene
    wait = false
    animationActions: { [key: string]: AnimationAction } = {}
    activeAction = 'idle'
    speed = 0
    keyboard
    model?: Eve
  
    constructor(scene: Scene, keyboard: Keyboard) {
      this.scene = scene
      this.keyboard = keyboard
    }
  
    async init() {
      this.model = new Eve()
      await this.model.init(this.animationActions)
      this.scene.add(this.model)
    }
  
    setAction(action: string) {
      if (this.activeAction != action) {
        this.animationActions[this.activeAction].fadeOut(0.1)
        this.animationActions[action].reset().fadeIn(0.1).play()
        this.activeAction = action
      }
    }
  
    update(delta: number) {
      if (!this.wait) {
        let actionAssigned = false
  
        if (this.keyboard.keyMap['Space']) {
          this.setAction('jump')
          actionAssigned = true
          this.wait = true
          setTimeout(() => (this.wait = false), 1200)
        }
  
        if (
          !actionAssigned &&
          (this.keyboard.keyMap['KeyW'] ||
            this.keyboard.keyMap['KeyA'] ||
            this.keyboard.keyMap['KeyS'] ||
            this.keyboard.keyMap['KeyD'])
        ) {
          this.setAction('walk')
          actionAssigned = true
        }
  
        if (!actionAssigned && this.keyboard.keyMap['KeyQ']) {
          this.setAction('pose')
          actionAssigned = true
        }
  
        !actionAssigned && this.setAction('idle')
      }
  
      if (this.activeAction === 'walk') {
        this.model?.update(delta * 2)
      } else {
        this.model?.update(delta)
      }
    }
  }
  
  class FollowCam {
    camera: PerspectiveCamera
    pivot = new Object3D()
    yaw = new Object3D()
    pitch = new Object3D()
  
    constructor(scene: Scene, camera: PerspectiveCamera, renderer: WebGLRenderer) {
      this.camera = camera
  
      this.yaw.position.y = 0.75
  
      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === renderer.domElement) {
          renderer.domElement.addEventListener('mousemove', this.onDocumentMouseMove)
          renderer.domElement.addEventListener('wheel', this.onDocumentMouseWheel)
        } else {
          renderer.domElement.removeEventListener('mousemove', this.onDocumentMouseMove)
          renderer.domElement.removeEventListener('wheel', this.onDocumentMouseWheel)
        }
      })
  
      scene.add(this.pivot)
      this.pivot.add(this.yaw)
      this.yaw.add(this.pitch)
      this.pitch.add(camera)
    }
  
    onDocumentMouseMove = (e: MouseEvent) => {
      this.yaw.rotation.y -= e.movementX * 0.002
      const v = this.pitch.rotation.x - e.movementY * 0.002
  
      if (v > -1 && v < 1) {
        this.pitch.rotation.x = v
      }
    }
  
    onDocumentMouseWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = this.camera.position.z + e.deltaY * 0.005
  
      if (v >= 0.5 && v <= 10) {
        this.camera.position.z = v
      }
    }
  }
  
  class Player {
    scene: Scene
    world: World
    body: RigidBody
    animationController?: AnimationController
    position: Vector3
    inputVelocity = new Vector3()
    euler = new Euler()
    quaternion = new Quaternion()
    followTarget = new Object3D()
    grounded = true
    rotationMatrix = new Matrix4()
    targetQuaternion = new Quaternion()
    followCam: FollowCam
    keyboard: Keyboard
    wait = false
    handle = -1
  
    constructor(
      scene: Scene,
      camera: PerspectiveCamera,
      renderer: WebGLRenderer,
      world: World,
      position: [number, number, number] = [0, 0, 0]
    ) {
      this.scene = scene
      this.world = world
      this.keyboard = new Keyboard(renderer)
      this.followCam = new FollowCam(this.scene, camera, renderer)
      this.position = new Vector3(...position)
  
      scene.add(this.followTarget)
  
      this.body = world.createRigidBody(
        RigidBodyDesc.dynamic()
          .setTranslation(...position)
          .enabledRotations(false, false, false)
          .setLinearDamping(4)
          .setCanSleep(false)
      )
      this.handle = this.body.handle
  
      const shape = ColliderDesc.capsule(0.5, 0.15)
        .setTranslation(0, 0.645, 0)
        .setMass(1)
        .setFriction(0)
        .setActiveEvents(ActiveEvents.COLLISION_EVENTS)
  
      world.createCollider(shape, this.body)
    }
  
    async init() {
      this.animationController = new AnimationController(this.scene, this.keyboard)
      await this.animationController.init()
    }
  
    setGrounded(grounded: boolean) {
      if (grounded != this.grounded) {
        this.grounded = grounded
        if (grounded) {
          this.body.setLinearDamping(4)
          setTimeout(() => {
            this.wait = false
          }, 250)
        } else {
          this.body.setLinearDamping(0)
        }
      }
    }
  
    reset() {
      this.body.setLinvel(new Vector3(0, 0, 0), true)
      this.body.setTranslation(new Vector3(0, 1, 0), true)
    }
  
    update(delta: number) {
      this.inputVelocity.set(0, 0, 0)
      let limit = 1
      if (this.grounded) {
        if (this.keyboard.keyMap['KeyW']) {
          this.inputVelocity.z = -1
          limit = 9.5
        }
        if (this.keyboard.keyMap['KeyS']) {
          this.inputVelocity.z = 1
          limit = 9.5
        }
        if (this.keyboard.keyMap['KeyA']) {
          this.inputVelocity.x = -1
          limit = 9.5
        }
        if (this.keyboard.keyMap['KeyD']) {
          this.inputVelocity.x = 1
          limit = 9.5
        }
  
        this.inputVelocity.setLength(delta * limit)
  
        if (!this.wait && this.keyboard.keyMap['Space']) {
          this.wait = true
          this.inputVelocity.y = 5
        }
      }
  
      this.euler.y = this.followCam.yaw.rotation.y
      this.quaternion.setFromEuler(this.euler)
      this.inputVelocity.applyQuaternion(this.quaternion)
  
      this.body.applyImpulse(this.inputVelocity, true)
  
      if (this.body.translation().y < -10) {
        this.reset()
      }
  
      this.followTarget.position.copy(this.body.translation())
      this.followTarget.getWorldPosition(this.position)
      this.followCam.pivot.position.lerp(this.position, delta * 10)
  
      this.animationController?.model?.position.lerp(this.position, delta * 20)
  
      this.rotationMatrix.lookAt(
        this.followTarget.position,
        this.animationController?.model?.position as Vector3,
        this.animationController?.model?.up as Vector3
      )
      this.targetQuaternion.setFromRotationMatrix(this.rotationMatrix)
  
      const distance = this.animationController?.model?.position.distanceTo(
        this.followTarget.position
      )
  
      if (
        (distance as number) > 0.0001 &&
        !this.animationController?.model?.quaternion.equals(this.targetQuaternion)
      ) {
        this.targetQuaternion.z = 0
        this.targetQuaternion.x = 0
        this.targetQuaternion.normalize()
        this.animationController?.model?.quaternion.rotateTowards(
          this.targetQuaternion,
          delta * 20
        )
      }
  
      this.animationController?.update(delta)
    }
  }
  
  class OtherPlayer {
    id: string
    animationActions: { [key: string]: AnimationAction } = {}
    activeAction = 'idle'
    speed = 0
    model?: Object3D
    mixer?: AnimationMixer
    world: World
    body?: RigidBody
    handle = -1
  
    constructor(id: string, player: Player, world: World) {
      this.id = id
      this.world = world
  
      this.model = SkeletonUtils.clone(player.animationController?.model as Object3D)
      this.model.name = id
      this.mixer = new AnimationMixer(this.model)
      this.animationActions['idle'] = this.mixer.clipAction(
        player.animationController?.model?.animations[0] as AnimationClip
      )
      this.animationActions['walk'] = this.mixer.clipAction(
        player.animationController?.model?.animations[1] as AnimationClip
      )
      this.animationActions['jump'] = this.mixer.clipAction(
        player.animationController?.model?.animations[2] as AnimationClip
      )
      this.animationActions['pose'] = this.mixer.clipAction(
        player.animationController?.model?.animations[3] as AnimationClip
      )
  
      this.animationActions[this.activeAction].play()
    }
  
    init(position: [number, number, number] = [0, 0, 0]) {
      this.model?.position.set(...position)
  
      this.body = this.world.createRigidBody(
        RigidBodyDesc.dynamic()
          .setTranslation(...position)
          .enabledRotations(false, false, false)
          .setLinearDamping(4)
          .setCanSleep(false)
      )
      this.handle = this.body.handle
  
      const shape = ColliderDesc.capsule(0.5, 0.15)
        .setTranslation(0, 0.645, 0)
        .setMass(1)
        .setFriction(0)
  
      this.world.createCollider(shape, this.body)
    }
  
    setAction(action: string) {
      if (this.activeAction != action) {
        this.animationActions[this.activeAction].fadeOut(0.1)
        this.animationActions[action].reset().fadeIn(0.1).play()
        this.activeAction = action
      }
    }
  
    update(delta: number) {
      this.body?.setTranslation(this.model?.position as Vector3, true)
      if (this.activeAction === 'walk') {
        this.mixer?.update(delta * 2)
      } else {
        this.mixer?.update(delta)
      }
    }
  }
  
  class Environment {
    scene: Scene
    light: DirectionalLight
  
    constructor(scene: Scene) {
      this.scene = scene
  
      this.scene.add(new GridHelper(25, 25))
  
      this.light = new DirectionalLight(0xffffff, Math.PI)
      this.light.position.set(65.7, 19.2, 50.2)
      this.light.castShadow = true
      this.scene.add(this.light)
  
      const textureLoader = new TextureLoader()
      const textureFlare0 = textureLoader.load('img/lensflare0.png')
      const textureFlare3 = textureLoader.load('img/lensflare3.png')
  
      const lensflare = new Lensflare()
      lensflare.addElement(new LensflareElement(textureFlare0, 1000, 0))
      lensflare.addElement(new LensflareElement(textureFlare3, 500, 0.2))
      lensflare.addElement(new LensflareElement(textureFlare3, 250, 0.8))
      lensflare.addElement(new LensflareElement(textureFlare3, 125, 0.6))
      lensflare.addElement(new LensflareElement(textureFlare3, 62.5, 0.4))
      this.light.add(lensflare)
    }
  
    async init() {
      await new RGBELoader().loadAsync('img/venice_sunset_1k.hdr').then((texture) => {
        texture.mapping = EquirectangularReflectionMapping
        this.scene.environment = texture
        this.scene.background = texture
        this.scene.backgroundBlurriness = 0.4
      })
    }
  }
  
  class UI {
    renderer: WebGLRenderer
    instructions: HTMLDivElement
  
    constructor(renderer: WebGLRenderer) {
      this.renderer = renderer
  
      this.instructions = document.getElementById('instructions') as HTMLDivElement
  
      const startButton = document.getElementById('startButton') as HTMLButtonElement
      startButton.addEventListener(
        'click',
        () => {
          renderer.domElement.requestPointerLock()
        },
        false
      )
  
      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === this.renderer.domElement) {
          this.instructions.style.display = 'none'
        } else {
          this.instructions.style.display = 'block'
        }
      })
    }
  
    show() {
      ;(document.getElementById('spinner') as HTMLDivElement).style.display = 'none'
      this.instructions.style.display = 'block'
    }
  }
  
  export default class Game {
    scene: Scene
    camera: PerspectiveCamera
    renderer: WebGLRenderer
    player?: Player
    world?: World
    eventQueue?: EventQueue
    socket: any
    myId = ''
    clients: { [id: string]: OtherPlayer } = {}
    positions: { [id: string]: Vector3 } = {}
    quaternions: { [id: string]: Quaternion } = {}
  
    constructor(scene: Scene, camera: PerspectiveCamera, renderer: WebGLRenderer) {
      this.scene = scene
      this.camera = camera
      this.renderer = renderer
    }
  
    async init() {
      await RAPIER.init()
      const gravity = new Vector3(0.0, -9.81, 0.0)
  
      this.world = new World(gravity)
      this.eventQueue = new EventQueue(true)
  
      const floorMesh = new Mesh(new BoxGeometry(25, 1, 25), new MeshStandardMaterial())
      floorMesh.receiveShadow = true
      floorMesh.position.y = -0.5
      this.scene.add(floorMesh)
      const floorBody = this.world.createRigidBody(
        RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)
      )
      const floorShape = ColliderDesc.cuboid(12.5, 0.5, 12.5)
      this.world.createCollider(floorShape, floorBody)
  
      this.player = new Player(this.scene, this.camera, this.renderer, this.world, [
        Math.random() * 20 - 10,
        0.1,
        Math.random() * 20 - 10
      ])
      await this.player.init()
  
      this.socket = io()
      this.socket.on('id', (id: string) => {
        this.myId = id
        setInterval(() => {
          this.socket.emit('update', {
            p: this.player?.position,
            q: this.player?.animationController?.model?.quaternion,
            a: this.player?.animationController?.activeAction
          })
        }, 100)
      })
      this.socket.on('clients', (clients: any) => {
        Object.keys(clients).forEach((c) => {
          if (c != this.myId) {
            if (!this.clients[c] && clients[c].p) {
              this.clients[c] = new OtherPlayer(
                c,
                this.player as Player,
                this.world as RAPIER.World
              )
              this.clients[c].init([clients[c].p.x, clients[c].p.y, clients[c].p.z])
              this.scene.add(this.clients[c].model as Object3D)
            } else {
              clients[c].p && (this.positions[c] = clients[c].p)
              clients[c].q && (this.quaternions[c] = new Quaternion(...clients[c].q))
              clients[c].a && this.clients[c].setAction(clients[c].a)
            }
          }
        })
      })
      this.socket.on('removeClient', (id: string) => {
        console.log('removing ' + id)
        this.scene.remove(this.scene.getObjectByName(id) as Object3D)
        this.world?.removeRigidBody(this.clients[id].body as RAPIER.RigidBody)
        delete this.clients[id]
        delete this.positions[id]
        delete this.quaternions[id]
      })
  
      const environment = new Environment(this.scene)
      await environment.init()
      environment.light.target = this.player.followTarget
  
      const ui = new UI(this.renderer)
      ui.show()
    }
  
    update(delta: number) {
      ;(this.world as World).timestep = Math.min(delta, 0.1)
      this.world?.step(this.eventQueue)
      this.eventQueue?.drainCollisionEvents((handle1, handle2, started) => {
        let hitOtherPlayer = false
        Object.keys(this.clients).forEach((c) => {
          if ([handle1, handle2].includes(this.clients[c].handle)) {
            hitOtherPlayer = true
          }
        })
  
        if (!hitOtherPlayer) {
          this.player?.setGrounded(started)
        }
      })
      this.player?.update(delta)
  
      Object.keys(this.clients).forEach((c) => {
        this.positions[c] && this.clients[c].model?.position.lerp(this.positions[c], 0.1)
        this.quaternions[c] &&
          this.clients[c].model?.quaternion.slerp(this.quaternions[c], 0.1)
        this.clients[c].update(delta)
      })
    }
  }