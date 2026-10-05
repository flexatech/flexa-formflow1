/**
 * FormFlow block editor script. Plain JS on wp.* globals, no build step.
 * The preview is a static server-side render; it never submits.
 */
( function ( wp ) {
	'use strict';

	var el = wp.element.createElement;
	var __ = wp.i18n.__;

	wp.blocks.registerBlockType( 'flexa-formflow/form', {
		edit: function ( props ) {
			var formId = props.attributes.formId;
			var setFormId = function ( value ) {
				props.setAttributes( { formId: parseInt( value, 10 ) || 0 } );
			};

			var picker = el( FormPicker, { value: formId, onChange: setFormId } );

			var body;
			if ( ! formId ) {
				body = el(
					'div',
					{ style: { padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '6px' } },
					el( 'p', { style: { margin: '0 0 8px' } }, __( 'Pick a form to embed.', 'flexa-formflow' ) ),
					picker
				);
			} else {
				body = el(
					'div',
					null,
					el(
						'div',
						{ style: { marginBottom: '8px' } },
						picker
					),
					el( wp.serverSideRender, {
						block: 'flexa-formflow/form',
						attributes: props.attributes,
					} )
				);
			}

			return el( 'div', wp.blockEditor.useBlockProps ? wp.blockEditor.useBlockProps() : {}, body );
		},
		save: function () {
			return null;
		},
	} );

	function FormPicker( props ) {
		var state = wp.element.useState( null );
		var forms = state[ 0 ];
		var setForms = state[ 1 ];

		wp.element.useEffect( function () {
			wp.apiFetch( { path: '/flexa-formflow/v1/forms?per_page=100' } )
				.then( function ( response ) {
					setForms( response.items || [] );
				} )
				.catch( function () {
					setForms( [] );
				} );
		}, [] );

		var options = [ { value: 0, label: __( 'Choose a form…', 'flexa-formflow' ) } ];
		( forms || [] ).forEach( function ( form ) {
			options.push( {
				value: form.id,
				label: form.title + ( form.status !== 'published' ? ' (' + __( 'draft', 'flexa-formflow' ) + ')' : '' ),
			} );
		} );

		return el( wp.components.SelectControl, {
			label: __( 'Form', 'flexa-formflow' ),
			value: props.value,
			options: options,
			onChange: props.onChange,
			__nextHasNoMarginBottom: true,
		} );
	}
} )( window.wp );
