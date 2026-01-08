import {color, mix, normalWorld, output, Fn, uniform, vec4, rotate, screenCoordinate, screenSize  } from 'three/tsl'
import * as THREE from 'three'
import * as boiler from './boiler'


// https://threejs.dev/examples/?q=halft&edit=#webgpu_tsl_halftone

// Setup Inspector GUI
const halftoneGui = boiler.renderer.inspector.createParameters("Halftone");
halftoneGui.close()

	let halftoneSettings = [
		// yellow highlight

		{
			count: 180,
			color: 'yellow',
			direction: new THREE.Vector3( 0.5, 0.5, 1 ),
			start: 0.55,
			end: 0.2,
			mixLow: 0.5,
			mixHigh: 1,
			radius: 0.8
		},

		// {
		// 	count: 180,
		// 	color: 'grey',
		// 	direction: new THREE.Vector3( 0.5, 0.5, 1 ),
		// 	start: 0.55,
		// 	end: 0.2,
		// 	mixLow: 0.5,
		// 	mixHigh: 1,
		// 	radius: 0.8
		// },

	];

	for ( const index in halftoneSettings ) {

		const settings = halftoneSettings[ index ];

		// uniforms

		const uniforms = {};

		uniforms.count = uniform( settings.count );
		uniforms.color = uniform( color( settings.color ) );
		uniforms.direction = uniform( settings.direction );
		uniforms.start = uniform( settings.start );
		uniforms.end = uniform( settings.end );
		uniforms.mixLow = uniform( settings.mixLow );
		uniforms.mixHigh = uniform( settings.mixHigh );
		uniforms.radius = uniform( settings.radius );

		settings.uniforms = uniforms;

		// debug

		const folder = halftoneGui.addFolder( `⚪️ halftone ${index}` );
		folder.close()

		folder.addColor( { color: uniforms.color.value }, 'color' );
		folder.add( uniforms.count, 'value', 1, 200, 1 ).name( 'count' );
		folder.add( uniforms.direction.value, 'x', - 1, 1, 0.01 ).listen();
		folder.add( uniforms.direction.value, 'y', - 1, 1, 0.01 ).listen();
		folder.add( uniforms.direction.value, 'z', - 1, 1, 0.01 ).listen();
		folder.add( uniforms.start, 'value', - 1, 1, 0.01 ).name( 'start' );
		folder.add( uniforms.end, 'value', - 1, 1, 0.01 ).name( 'end' );
		folder.add( uniforms.mixLow, 'value', 0, 1, 0.01 ).name( 'mix low' );
		folder.add( uniforms.mixHigh, 'value', 0, 1, 0.01 ).name( 'mix high' );
		folder.add( uniforms.radius, 'value', 0, 1, 0.01 ).name( 'radius' );

	}


export const halftone = Fn( ( [ count, color, direction, start, end, radius, mixLow, mixHigh ] ) => {

		// grid pattern
		let gridUv = screenCoordinate.xy.div( screenSize.yy ).mul( count );
		gridUv = rotate( gridUv, Math.PI * 0.25 ).mod( 1 );

		// orientation strength
		const orientationStrength = normalWorld
			.dot( direction.normalize() )
			.remapClamp( end, start, 0, 1 );

		// mask
		const mask = orientationStrength.mul( radius ).mul( 0.5 )
			.step( gridUv.sub( 0.5 ).length() )
			.mul( mix( mixLow, mixHigh, orientationStrength ) );

		return vec4( color, mask );

	} );

export const halftones = Fn( ( [ input ] ) => {

		const halftonesOutput = input;

		for ( const settings of halftoneSettings ) {

			const halfToneOutput = halftone( settings.uniforms.count, settings.uniforms.color, settings.uniforms.direction, settings.uniforms.start, settings.uniforms.end, settings.uniforms.radius, settings.uniforms.mixLow, settings.uniforms.mixHigh );
			halftonesOutput.rgb.assign( mix( halftonesOutput.rgb, halfToneOutput.rgb, halfToneOutput.a ) );

		}

		return halftonesOutput;

	} );