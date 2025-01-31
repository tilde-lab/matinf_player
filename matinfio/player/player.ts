namespace $ {

	const math = $optimade_cifplayer_lib_math

	/** Prepare internal repr for visualization in three.js */
	export function $optimade_cifplayer_matinfio_player_from_obj( this: $, crystal: $optimade_cifplayer_matinfio_internal_obj ) {
		let cell_matrix: number[][] | undefined
		let descr: any = false

		if( crystal.cell && Object.keys( crystal.cell ).length == 6 ) { // for CIF

			cell_matrix = this.$optimade_cifplayer_matinfio_cell_to_matrix( crystal.cell )
			descr = crystal.cell
			var symlabel = ( crystal.sg_name || crystal.ng_name ) ? ( ( crystal.sg_name ? crystal.sg_name : "" ) + ( crystal.ng_name ? ( " (" + crystal.ng_name + ")" ) : "" ) ) : false
			if( symlabel ) descr.symlabel = symlabel

		} else {
			
			cell_matrix = crystal.cell_matrix // for POSCAR and OPTIMADE
			if( cell_matrix ) {
				const [ a, b, c, alpha, beta, gamma ] = $optimade_cifplayer_matinfio_cell_params_from_matrix( cell_matrix )
				descr = { a, b, c, alpha, beta, gamma }
			}
		}

		if( !crystal.atoms.length ) this.$optimade_cifplayer_matinfio_log.warning( "Note: no atomic coordinates supplied" )

		const render: $optimade_cifplayer_matinfio_player_obj = {
			atoms: [] as any[],
			cell_matrix: cell_matrix,
			cell: descr,
			descr: descr,
			overlayed: {} as Record< string, string >,
			sg_name: crystal.sg_name,
			ng_name: parseInt( crystal.ng_name ),
			info: crystal.info,
			mpds_data: crystal.mpds_data,
			mpds_demo: crystal.mpds_demo,

			warning: crystal.warning,
		}

		const groups: { fpos: number[] | null, cpos: number[], atoms: $optimade_cifplayer_matinfio_internal_obj_atom[] }[] = []

		// make atoms unique, i.e. remove collisions;
		for( let i = 0; i < crystal.atoms.length; i++ ) {
			const atom = crystal.atoms[ i ]

			const pos = [ atom.x, atom.y, atom.z ]

			// CIF has fractional positions
			// OPTIMADE has cartesian positions
			// POSCAR may have either of two
			const fpos: number[] | null = crystal.cartesian
				? cell_matrix ? math.divide( pos, cell_matrix ).map( fract_cord_norm ) : null
				: pos.map( fract_cord_norm )

			const cpos: number[] = fpos ? math.multiply( fpos, cell_matrix ) : pos

			if( groups.some( group => {
				if( is_overlap( cpos, group.cpos, $optimade_cifplayer_matinfio.pos_overlap_limit ) ) {

					const AseRadii = $optimade_cifplayer_matinfio_chemical_elements.AseRadii[ atom.symbol ]
					const pos = group.atoms.findIndex( atom2 => {
						return AseRadii > $optimade_cifplayer_matinfio_chemical_elements.AseRadii[ atom2.symbol ]
					} )

					if( pos == -1 ) group.atoms.push( atom )
					else group.atoms.splice( pos, 0, atom )

					return true

				}
			} ) ) {
				continue
			}

			groups.push( { fpos, cpos, atoms: [ atom ] } )
		}

		for( let i = 0; i < groups.length; i++ ) {

			const { fpos, cpos, atoms } = groups[i]

			const overlays: Record< string, string | number > = {
				"S": atoms[0].symbol,
				"N": i + 1,
			}
			for( let oprop in atoms[0].overlays ) {
				overlays[ oprop ] = atoms[0].overlays[ oprop ]
			}

			atoms.slice(1).forEach( atom => {
				for( let oprop in overlays ) {
					
					if( oprop == 'S' ) {
						if( atoms.every( a => a.symbol != atom.symbol ) ) {
							overlays[ oprop ] += ' ' + atom.symbol
						}

					} else if( oprop == 'N' ) {
						overlays[ oprop ] += ', ' + ( i + 1 )

					} else if( oprop == '_atom_site_occupancy' ) {
						overlays[ oprop ] += '+' + atom.overlays[ oprop ]

					} else {
						overlays[ oprop ] += ' ' + atom.overlays[ oprop ]
					}

				}
			} )

			const color = $optimade_cifplayer_matinfio_chemical_elements.JmolColors[ atoms[0].symbol ] || '#FFFF00'
			const radius = $optimade_cifplayer_matinfio_chemical_elements.AseRadii[ atoms[0].symbol ] || 0.66
			const atom_result = { 
				fract: fpos ? {
					x: fpos[ 0 ],
					y: fpos[ 1 ],
					z: fpos[ 2 ],
				} : null,
				x: cpos[ 0 ],
				y: cpos[ 1 ],
				z: cpos[ 2 ],
				c: color,
				r: radius,
				overlays,
				symbol: atoms[0].symbol,
				label: atoms[0].label,
			}

			render.atoms.push( atom_result )
			
		}

		for( let oprop in crystal.atoms.at(-1)!.overlays ) {
			render.overlayed[ oprop ] = $optimade_cifplayer_matinfio_custom_atom_loop_props[ oprop ]
		}
		
		return render
	}
	

	function fract_cord_norm( cord: number ){
		const res = cord % 1
		return res > 0 ? res : res + 1
	}

	function is_overlap( pos1: number[], pos2: number[], threshold: number ) {
		for( let i = 0; i < 3; i++ ) {
			if ( pos1[i] < pos2[i] - threshold || pos1[i] > pos2[i] + threshold ) return false
		}
		return true
	}

}
