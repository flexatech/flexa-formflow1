/**
 * Flexa FormFlow frontend submit. Plain JS, no build step, multi-instance
 * safe: every .flexa-formflow-form on the page is wired independently.
 */
( function () {
	'use strict';

	var config = window.flexaFormFlowFront || {};

	function collect( form ) {
		var fields = {};
		form.querySelectorAll( '[name]' ).forEach( function ( input ) {
			var name = input.name;
			if ( name === 'ff_website' || name === '_ff_ts' ) {
				return;
			}
			if ( input.type === 'checkbox' ) {
				if ( ! fields[ name ] ) {
					fields[ name ] = [];
				}
				if ( input.checked ) {
					fields[ name ].push( input.value );
				}
			} else if ( input.type === 'radio' ) {
				if ( ! ( name in fields ) ) {
					fields[ name ] = '';
				}
				if ( input.checked ) {
					fields[ name ] = input.value;
				}
			} else {
				fields[ name ] = input.value;
			}
		} );
		return fields;
	}

	function clearErrors( form ) {
		form.querySelectorAll( '.flexa-formflow-error' ).forEach( function ( el ) {
			el.hidden = true;
			el.textContent = '';
		} );
		form.querySelectorAll( '.flexa-formflow-field--invalid' ).forEach( function ( el ) {
			el.classList.remove( 'flexa-formflow-field--invalid' );
		} );
	}

	function showErrors( form, errors ) {
		Object.keys( errors ).forEach( function ( fieldId ) {
			var slot = form.querySelector( '[data-error-for="' + fieldId + '"]' );
			var wrap = form.querySelector( '[data-field="' + fieldId + '"]' );
			if ( slot ) {
				slot.textContent = errors[ fieldId ];
				slot.hidden = false;
			}
			if ( wrap ) {
				wrap.classList.add( 'flexa-formflow-field--invalid' );
			}
		} );
		var first = form.querySelector( '.flexa-formflow-field--invalid' );
		if ( first ) {
			first.scrollIntoView( { behavior: 'smooth', block: 'center' } );
		}
	}

	function wire( form ) {
		form.addEventListener( 'submit', function ( event ) {
			event.preventDefault();
			if ( form.dataset.pending === '1' || ! config.restUrl ) {
				return;
			}

			clearErrors( form );
			var button = form.querySelector( '.flexa-formflow-submit' );
			var message = form.querySelector( '.flexa-formflow-message' );
			var honeypot = form.querySelector( '[name="ff_website"]' );
			var timestamp = form.querySelector( '[name="_ff_ts"]' );

			form.dataset.pending = '1';
			if ( button ) {
				button.disabled = true;
			}

			fetch( config.restUrl + form.dataset.uuid, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( {
					fields: collect( form ),
					ff_website: honeypot ? honeypot.value : '',
					_ff_ts: timestamp ? parseInt( timestamp.value, 10 ) : 0,
				} ),
			} )
				.then( function ( response ) {
					return response.json().then( function ( body ) {
						return { ok: response.ok, body: body };
					} );
				} )
				.then( function ( result ) {
					if ( result.ok ) {
						var success = document.createElement( 'p' );
						success.className = 'flexa-formflow-success';
						success.setAttribute( 'role', 'status' );
						success.textContent = result.body.message || '';
						form.replaceWith( success );
						return;
					}
					var data = result.body.data || {};
					if ( data.errors ) {
						showErrors( form, data.errors );
					}
					if ( message ) {
						message.textContent = result.body.message || '';
						message.hidden = ! result.body.message;
					}
				} )
				.catch( function () {
					if ( message ) {
						message.textContent = form.dataset.networkError || 'Something went wrong. Please try again.';
						message.hidden = false;
					}
				} )
				.finally( function () {
					delete form.dataset.pending;
					if ( button ) {
						button.disabled = false;
					}
				} );
		} );
	}

	// Read a field's current value from the form: checkbox groups join with a
	// comma, radios take the checked value, everything else the input value.
	function fieldValue( form, fieldId ) {
		var inputs = form.querySelectorAll( '[name="' + fieldId + '"]' );
		if ( ! inputs.length ) {
			return '';
		}
		var first = inputs[ 0 ];
		if ( first.type === 'checkbox' ) {
			var picked = [];
			inputs.forEach( function ( input ) {
				if ( input.checked ) {
					picked.push( input.value );
				}
			} );
			return picked.join( ', ' );
		}
		if ( first.type === 'radio' ) {
			var value = '';
			inputs.forEach( function ( input ) {
				if ( input.checked ) {
					value = input.value;
				}
			} );
			return value;
		}
		return first.value;
	}

	function conditionPasses( operator, actual, expected ) {
		var a = String( actual );
		var b = String( expected );
		switch ( operator ) {
			case 'equals':
				return a === b;
			case 'not_equals':
				return a !== b;
			case 'contains':
				return b !== '' && a.toLowerCase().indexOf( b.toLowerCase() ) !== -1;
			case 'not_empty':
				return a.trim() !== '';
			case 'is_empty':
				return a.trim() === '';
			default:
				return true;
		}
	}

	// Field show/hide logic (the single Free rule). A hidden-by-logic field is
	// display:none and its inputs are disabled so they never submit.
	function wireLogic( form ) {
		var rules = [];
		form.querySelectorAll( '.flexa-formflow-field[data-ff-logic]' ).forEach( function ( wrap ) {
			var logic;
			try {
				logic = JSON.parse( wrap.getAttribute( 'data-ff-logic' ) );
			} catch ( e ) {
				return;
			}
			if ( logic && logic.field && logic.operator ) {
				rules.push( { wrap: wrap, logic: logic } );
			}
		} );
		if ( ! rules.length ) {
			return;
		}

		function evaluate() {
			rules.forEach( function ( rule ) {
				var passes = conditionPasses( rule.logic.operator, fieldValue( form, rule.logic.field ), rule.logic.value );
				var visible = rule.logic.action === 'hide' ? ! passes : passes;
				rule.wrap.style.display = visible ? '' : 'none';
				rule.wrap.querySelectorAll( 'input, select, textarea' ).forEach( function ( input ) {
					input.disabled = ! visible;
				} );
			} );
		}

		form.addEventListener( 'input', evaluate );
		form.addEventListener( 'change', evaluate );
		evaluate();
	}

	function init() {
		document.querySelectorAll( '.flexa-formflow-form' ).forEach( function ( form ) {
			wire( form );
			wireLogic( form );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
