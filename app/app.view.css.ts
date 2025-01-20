namespace $.$$ {

	$mol_style_define( $optimade_cifplayer_app, {

		contain: 'none', // otherwise in fullscreen 'fixed' positions plot relative to parent is not in the viewport

		'[mol_drop_status]': {
			drag: {
				Menu: {
					background: {
						color: $mol_theme.hover,
					},
				},
			},
		},

		Start: {
			background: {
				color: $mol_theme.back,
			},
			padding: {
				top: '6rem',
			},
			flex: {
				grow: 1,
				direction: 'column',
			},
			align: {
				items: 'center',
			},
		},

		Menu: {
			Body_content: {
				gap: $mol_gap.block,
				maxWidth: '25rem',
				flex: {
					direction: 'row',
				},
			},
			Head: {
				justify: {
					content: 'flex-start'
				},
			},
		},

		Data_text: {
			font: {
				family: 'inherit',
			},
		},

		Body: {
			flex: { 
				direction: 'column',
				grow: 1,
			},
		},

		Player: {
			flex: {
				grow: 1,
				basis: '30rem',
			},
		},

	} )

}
