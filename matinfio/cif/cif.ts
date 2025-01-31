namespace $ {

	const math = $optimade_cifplayer_lib_math

	export function $optimade_cifplayer_matinfio_cif_to_obj( this: $, str: string ): $optimade_cifplayer_matinfio_internal_obj {
		const structures = []
		let symops = []
		let atprop_seq: any[] = []
		let lines = str.toString().replace( /(\r\n|\r)/gm, "\n" ).split( "\n" )
		let cur_structure: any | $optimade_cifplayer_matinfio_internal_obj = {
			cell: {},
			atoms: [],
			cartesian: false,
			mpds_demo: false,
		}
		let loop_active = false
		let new_structure = false
		let symops_active = false
		let data_info = ""
		let cur_line = ""
		let fingerprt = ""
		let line_data: any[] = []
		let symmetry_seq = []
		const cell_props = [ 'a', 'b', 'c', 'alpha', 'beta', 'gamma' ]
		const loop_vals = [
			'_atom_site_label',
			'_atom_site_type_symbol',
			'_atom_site_fract_x',
			'_atom_site_fract_y',
			'_atom_site_fract_z',
			"_atom_site_Cartn_x",
			"_atom_site_Cartn_y",
			"_atom_site_Cartn_z",
		]
		const atom_props = [
			'label',
			'symbol',
			'x',
			'y',
			'z',
			'x',
			'y',
			'z',
		]
		const chem_element_idxs = [ 0, 1 ]
		let overlayed_idxs = []

		for( let oprop in $optimade_cifplayer_matinfio_custom_atom_loop_props ) {
			overlayed_idxs.push( loop_vals.length )
			loop_vals.push( oprop )
		}

		for( let i = 0; i < lines.length; i++ ) {
			if( lines[ i ].startsWith('#') ) continue
			cur_line = lines[ i ].trim()
			if( !cur_line ) {
				loop_active = false, atprop_seq = [], symops_active = false
				continue
			}
			fingerprt = cur_line.toLowerCase()
			new_structure = false

			if( fingerprt.startsWith( 'data_' ) ) {
				new_structure = true
				loop_active = false
				atprop_seq = []
				symops_active = false
				data_info = cur_line.substr( 5 )

			} else if( fingerprt.startsWith( '_cell_' ) ) {
				loop_active = false
				line_data = cur_line.split( " " )
				const cell_data = line_data[ 0 ].split( "_" )
				const cell_prop_name = cell_data[ cell_data.length - 1 ]
				if( cell_props.indexOf( cell_prop_name ) !== -1 && line_data[ line_data.length - 1 ] ) {

					if( cell_prop_name == 'a' ) { // MPDS demo check
						const digits = line_data[ line_data.length - 1 ].split( '.' )
						if( digits[ digits.length - 1 ].length == 2 )
							cur_structure.mpds_demo = true
					}
					cur_structure.cell[ cell_prop_name ] = parseFloat( line_data[ line_data.length - 1 ] )
				}
				continue

			} else if( 
				fingerprt.startsWith( '_symmetry_space_group_name_h-m' ) 
				|| fingerprt.startsWith( '_space_group.patterson_name_h-m' )
				|| fingerprt.startsWith( '_space_group_name_h-m_alt' )
			) {
				loop_active = false
				const match = cur_line.match( /"(.*)"|'(.*)'/ )
				cur_structure.sg_name = match?.[1] || match?.[2]
				continue

			} else if( fingerprt.startsWith( '_space_group.it_number' ) || fingerprt.startsWith( '_space_group_it_number' ) || fingerprt.startsWith( '_symmetry_int_tables_number' ) ) {
				loop_active = false
				line_data = cur_line.split( " " )
				cur_structure.ng_name = line_data[ line_data.length - 1 ].trim()
				continue

			} else if( fingerprt.startsWith( '_cif_error' ) ) { // custom tag
				const error_message = cur_line.substr( 11, cur_line.length - 11 )
				return this.$mol_fail( new $mol_data_error( error_message ) )

			} else if( fingerprt.startsWith( '_cif_warning' ) ) { // custom tag
				cur_structure.warning = cur_line.substr( 13, cur_line.length - 13 )
				continue

			} else if( fingerprt.startsWith( '_pauling_file_entry' ) ) { // custom tag
				cur_structure.mpds_data = true
				continue

			} else if( fingerprt.startsWith( 'loop_' ) ) {
				loop_active = true
				atprop_seq = []
				symops_active = false
				continue
			}

			if( loop_active ) {
				if( cur_line.startsWith( '_symmetry_equiv' ) || cur_line.startsWith( '_space_group' ) ) {
					symops_active = true
				} else if( cur_line.startsWith( '_' ) ) {
					atprop_seq.push( cur_line )
					if( cur_line == '_atom_site_Cartn_x' ) cur_structure.cartesian = true
				} else {
					if( symops_active ) {
						symops.push( cur_line.replace( /"/g, '' ).replace( /'/g, '' ) )
						continue
					}
					line_data = cur_line.replace( /\t/g, " " ).split( " " ).filter( function( o ) { return o ? true : false } )

					const atom: any | $optimade_cifplayer_matinfio_internal_obj_atom = { overlays: {} }

					for( let j = 0; j < atprop_seq.length; j++ ) { // TODO handle in-loop mismatch
						const atom_index = loop_vals.indexOf( atprop_seq[ j ] )
						if( atom_index == -1 ) continue
						const pos = chem_element_idxs.indexOf( atom_index )

						// NB label != symbol
						if( pos == 1 ) line_data[ j ] = line_data[ j ].charAt( 0 ).toUpperCase() + line_data[ j ].slice( 1 ).toLowerCase()
						else if( pos < 0 ) line_data[ j ] = parseFloat( line_data[ j ] ) // TODO: custom non-float props in loop

						// TODO: simplify this
						if( overlayed_idxs.indexOf( atom_index ) > -1 ) atom.overlays[ loop_vals[ atom_index ] ] = line_data[ j ]
						else atom[ atom_props[ atom_index ] ] = line_data[ j ]
					}

					if( atom.x !== undefined && atom.y !== undefined && atom.z !== undefined ) { // NB zero coord // TODO multiple relative loops with props
						if( atom.label ) {
							atom.overlays.label = atom.label
							if( !atom.symbol ) atom.symbol = atom.label.replace( /[0-9]/g, '' )
						}
						if( ! $optimade_cifplayer_matinfio_chemical_elements.JmolColors[ atom.symbol ]
							&& atom.symbol
							&& atom.symbol.length > 1
						) {
							atom.symbol = atom.symbol.substr( 0, atom.symbol.length - 1 )
						}
						if( !!atom.symbol ) {
							cur_structure.atoms.push( atom )
						}
					}
				}
				continue
			}

			if( new_structure && cur_structure.atoms.length ) {
				cur_structure.info = data_info
				if( symops.length > 1 ) cur_structure.symops = symops
				structures.push( cur_structure )
				cur_structure = {
					'cell': {},
					'atoms': [],
					'cartesian': false
				}
				symops = []
			}
		}

		cur_structure.info = data_info
		if( symops.length > 1 ) cur_structure.symops = symops
		structures.push( cur_structure )

		if( !structures.length ) return this.$mol_fail( new $mol_data_error( 'Error: unexpected CIF format' ) )

		return structures[ structures.length - 1 ] // TODO switch between frames
	}



	/** Convert internal repr into CIF */
	export function $optimade_cifplayer_matinfio_cif_from_obj( this: $, crystal: any ) {

		let cif_str = "data_matinfio\n"
		let cell_abc
		let cell_mat

		if( Object.keys( crystal.cell ).length == 6 ) {
			cell_abc = crystal.cell
			cell_mat = this.$optimade_cifplayer_matinfio_cell_to_matrix( crystal.cell )
			// cell_mat = this.cell2vec( ...( crystal.cell as [ number, number, number, number, number, number ] ) )
		} else {
			cell_abc = $optimade_cifplayer_matinfio_cell_params_from_matrix( crystal.cell )
			cell_mat = crystal.cell
		}
		cif_str += "_cell_length_a    " + cell_abc[ 0 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_length_b    " + cell_abc[ 1 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_length_c    " + cell_abc[ 2 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_angle_alpha " + cell_abc[ 3 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_angle_beta  " + cell_abc[ 4 ].toFixed( 6 ) + "\n"
		cif_str += "_cell_angle_gamma " + cell_abc[ 5 ].toFixed( 6 ) + "\n"

		cif_str += "_symmetry_space_group_name_H-M 'P1'\n_symmetry_Int_Tables_number 1\n"
		cif_str += "\nloop_" + "\n"
		cif_str += " _symmetry_equiv_pos_as_xyz" + "\n"
		cif_str += " +x,+y,+z" + "\n"

		cif_str += "\nloop_" + "\n"
		cif_str += " _atom_site_label" + "\n"
		cif_str += " _atom_site_type_symbol" + "\n"
		cif_str += " _atom_site_fract_x" + "\n"
		cif_str += " _atom_site_fract_y" + "\n"
		cif_str += " _atom_site_fract_z" + "\n"

		if( crystal.cartesian ) {

			//var t_cell_mat = math.transpose(cell_mat);
			const t_cell_mat = cell_mat
			//console.log(t_cell_mat);

			crystal.atoms.forEach( function( atom: any, i: number ) {
				//console.log([atom.x, atom.y, atom.z]);
				// TODO better test lusolve against usolve, lsolve etc.
				let solved = math.lusolve( t_cell_mat, [ atom.x, atom.y, atom.z ] )
				let fracs = math.transpose( solved )[ 0 ]

				//console.log(fracs);
				cif_str += " " + atom.symbol + ( i + 1 ) + "  " + atom.symbol + "  "
					+ fracs[ 0 ].toFixed( 3 ) + "  " + fracs[ 1 ].toFixed( 3 ) + "  " + fracs[ 2 ].toFixed( 3 ) + "\n"
			} )

		} else {
			crystal.atoms.forEach( function( atom: any, i: number ) {
				cif_str += " " + atom.symbol + ( i + 1 ) + "  " + atom.symbol + "  "
					+ atom.x.toFixed( 3 ) + "  " + atom.y.toFixed( 3 ) + "  " + atom.z.toFixed( 3 ) + "\n"
			} )
		}
		return cif_str
	}

}
