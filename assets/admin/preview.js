/**
 * Flexa FormFlow builder preview. The preview shows the real frontend markup,
 * so it also carries a real <form>. This blocks submission: the preview is a
 * look-and-feel check, not a live form. Capture phase, so it runs before any
 * handler the form markup itself would attach.
 */
( function () {
	'use strict';

	document.addEventListener(
		'submit',
		function ( event ) {
			event.preventDefault();
		},
		true
	);
}() );
