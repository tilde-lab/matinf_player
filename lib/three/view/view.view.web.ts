namespace $.$$ {

	const THREE = $optimade_cifplayer_lib_three
	type THREE = typeof THREE

	export class $optimade_cifplayer_lib_three_view extends $.$optimade_cifplayer_lib_three_view {

		@ $mol_mem
		start_render_loop() {
			const render_loop = ()=> {
				this.rerender()
				requestAnimationFrame( ()=> render_loop() )
			}
			render_loop()
		}

		/** Get an existing object or create a new */
		object< T extends InstanceType< THREE["Object3D"] > >( name: string, make: ()=> T ): T {
			const old = this.scene()?.getObjectByName( name )
			if( old ) return old as T

			const obj = make()
			obj.name = name
			this.scene().add( obj )

			return obj
		}

		/** Remove an existing object and create a new */
		new_object< T extends InstanceType< THREE["Object3D"] > >( name: string, make: ()=> T ): T {
			const old = this.scene()?.getObjectByName( name )
			if( old ) this.remove_object( old )

			const obj = make()
			obj.name = name
			this.scene().add( obj )
			;(obj as any).destructor = ()=> this.remove_object( obj )

			return obj
		}

		remove_object( obj: any ) {
			$optimade_cifplayer_lib_three_view_dispose_deep( obj )
			this.scene()?.remove( obj )
		}

		@ $mol_mem
		scene() {
			const scene = new THREE.Scene()
			return scene
		}

		@ $mol_mem
		camera() {
			const camera = new THREE.PerspectiveCamera( 45, 0 )
			camera.position.set( 9, 9, 18 )
			return camera
		}

		@ $mol_mem
		controls_target() {
			return new THREE.Vector3()
		}

		@ $mol_mem
		controls_target_changed() {
			return this.controls().target = this.controls_target()
		}

		@ $mol_mem
		controls() {
			const controls = new THREE.TrackballControls( this.camera()!, this.dom_node_actual() as HTMLElement )

			controls.rotateSpeed = 7.5
			controls.staticMoving = true

			return controls
		}

		@ $mol_mem
		renderer() {
			if ( ! this.scene() || ! this.camera() ) return

			const renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } )
			renderer.domElement.style.position = 'absolute'
			
			return renderer
		}

		@ $mol_mem
		canvas() {
			return this.renderer()?.domElement
		}

		rerender() {
			this.on_render()

			this.renderer()?.render( this.scene(), this.camera() )
			this.controls()?.update()
		}

		@ $mol_mem
		size() {
			const rect = this.view_rect()
			if( !rect ) return

			const { width, height } = rect
			return { width, height }
		}

		@ $mol_mem
		resize() {
			const size = this.size()
			if( !size ) return

			const { width, height } = size

			this.camera()!.aspect = width / height
			this.camera()!.updateProjectionMatrix()

			this.renderer()!.setSize( width, height )
			this.rerender()

			this.controls().handleResize()
		}

		destructor(): void {
			$optimade_cifplayer_lib_three_view_dispose_deep( this.scene() )
			this.renderer()?.dispose()
		}

		pointerdown() {
			this.focused( true )
		}

	}


	/**
	 * Dispose of all Object3D`s nested Geometries, Materials and Textures
	 *
	 * @param object  Object3D, BufferGeometry, Material or Texture
	 * @param disposeMedia If set to true will dispose of the texture image or video element, default false
	 */
	export function $optimade_cifplayer_lib_three_view_dispose_deep(
		object: InstanceType< THREE["Object3D"] > | InstanceType< THREE["BufferGeometry"] > | InstanceType< THREE["Material"] > | InstanceType< THREE["Texture"] >
	) {
		const dispose = ( object: InstanceType< THREE["BufferGeometry"] > | InstanceType< THREE["Material"] > | InstanceType< THREE["Texture"] > ) => {
			object.dispose()
		}
		const disposeObject = ( object: any ) => {
			if( object.geometry ) dispose( object.geometry )
			if( object.material ) traverseMaterialsTextures( object.material, dispose, dispose )
		}

		if( object instanceof THREE.BufferGeometry || object instanceof THREE.Texture ) {
			return dispose( object )
		}

		if( object instanceof THREE.Material ) {
			return traverseMaterialsTextures( object, dispose, dispose )
		}

		disposeObject( object )

		if( object.traverse ) object.traverse( ( obj: any ) => disposeObject( obj ) )
	}

	/**
	 * Traverse material or array of materials and all nested textures
	 * executing there respective callback
	 *
	 * @param material          Three js Material or array of material
	 * @param materialCallback  Material callback
	 * @param textureCallback   THREE.Texture callback
	 */
	function traverseMaterialsTextures(
		material: InstanceType< THREE["Material"] > | InstanceType< THREE["Material"] >[],
		materialCallback?: ( material: any ) => void,
		textureCallback?: ( texture: any ) => void
	) {
		const traverseMaterial = ( mat: InstanceType< THREE["Material"] > ) => {
			if( materialCallback ) materialCallback( mat )

			if( !textureCallback ) return

			Object.values( mat )
				.filter( ( value: any ) => value instanceof THREE.Texture )
				.forEach( ( texture: any ) => textureCallback( texture ) )

			if( ( mat as any ).uniforms ) //InstanceType< THREE["ShaderMaterial"] >
				Object.values( ( mat as any ).uniforms )
					.filter( ( { value }: any ) => value instanceof THREE.Texture )
					.forEach( ( { value }: any ) => textureCallback( value ) )
		}

		if( Array.isArray( material ) ) {
			material.forEach( ( mat: any ) => traverseMaterial( mat ) )
		} else traverseMaterial( material )
	}

}
