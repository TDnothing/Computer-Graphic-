//APP class
"use strict";

function createAPP () 
{
	// Vertex shader program
	var VSHADER_SOURCE = 
		'attribute vec2 a_Position;\n' +
		'attribute vec3 a_Color;\n' +
		'varying vec4 color;\n' +
		'void main() {\n' +
			'gl_Position = vec4(a_Position, 0, 1);\n' +
			'color = vec4(a_Color, 1);\n' +
		'}\n';
		
	// Fragment shader program	
	var FSHADER_SOURCE =
        '#ifdef GL_ES\n' +
        'precision highp float;\n' +
        '#endif\n' +
        'varying vec4 color;\n' +
        'void main() {\n' +
        '    gl_FragColor = color;\n' +
        '}\n';
    
	//Global Variables
    var theta               = 0;
    var NumTimesToSubdivide = 4;
    var twist               = false;
    var prevpoints          = null;

    //UI Methods 
    this.setTwist = function (doTwist) 
    {
        twist = doTwist;
        redraw(true);
    }
    this.setSubdivide = function (subdivisions, id)
    {
        if (NumTimesToSubdivide != subdivisions) 
        {
            NumTimesToSubdivide = subdivisions;
            if (id)
                document.getElementById(id).innerHTML=NumTimesToSubdivide;
        }
        redraw(false);
    }
    this.setTheta = function (degrees, id)
    {       
        theta = degrees * Math.PI / 180;
        if (id)
            document.getElementById(id).innerHTML=degrees;
        redraw(true);
    }

    //Vertices methods
    function generateTriangle (r, a1, preserveColor) 
    {
        //Rotate the vertex proportionally to how far away from the center it is.
        function rotNtwist(v) 
        {
            var x = v[0],
                y = v[1],
                d = twist ? Math.sqrt(x*x + y*y) : 1,
                sintheta = Math.sin(d*theta),
                costheta = Math.cos(d*theta);

            return [x*costheta-y*sintheta, x*sintheta+y*costheta];
        }
        //generates a triangle and push data onto the points array
        function triangle (a, b, c) 
        {  

            var color = [Math.random(), Math.random(), Math.random()];
            var a2 = rotNtwist(a);
            var b2 = rotNtwist(b);
            var c2 = rotNtwist(c);
            //Color and vertex data are stored in the same buffer

            if (!preserveColor)
            {
                points.push (a2[0], a2[1]);
                points.push (color[0], color[1], color[2]);
                points.push (b2[0], b2[1]);
                points.push (color[0], color[1], color[2]);
                points.push (c2[0], c2[1]);
                points.push (color[0], color[1], color[2]);
            }
            else
            {
                points.push (a2[0], a2[1]);
                points.push (prevpoints[points.length], prevpoints[points.length + 1], prevpoints[points.length + 2]);
                points.push (b2[0], b2[1]);
                points.push (prevpoints[points.length], prevpoints[points.length + 1], prevpoints[points.length + 2]);
                points.push (c2[0], c2[1]);
                points.push (prevpoints[points.length], prevpoints[points.length + 1], prevpoints[points.length + 2]);
               
            }
        }
        //Recursive function 
        function divideTriangle(a, b, c, count) 
        {
            function avg(vec1, vec2) {
                return [(vec1[0]+vec2[0])/2,(vec1[1]+vec2[1])/2];
            }
            if ( count > 0 ) 
            {
                var v0 = avg(a, b),
                    v1 = avg(a, c),
                    v2 = avg(b, c);
                divideTriangle(a, v0, v1, count - 1);
                divideTriangle(c, v1, v2, count - 1);
                divideTriangle(b, v2, v0, count - 1);
                divideTriangle(v0, v1, v2, count - 1);
            }
            else 
            { // draw triangle
                triangle(a, b, c);
            }
        }

        var points = [];
        var first_tri = [];
        var dAngle = Math.PI*2 / 3;
        var i, angle;

        //Create the triangle for subdivided function.
        for (i=0; i < 3; i++) {
            angle = a1 + dAngle*i;
            first_tri.push([r*Math.cos(angle), r*Math.sin(angle)]);
        }

        divideTriangle(first_tri[0], first_tri[1], first_tri[2], NumTimesToSubdivide);

        //preserve the colors
        prevpoints = points;

        //Convert to Float32Array before returning.
        return new Float32Array(points);

    }



    var canvas = document.getElementById('webgl');
    var gl = getWebGLContext(canvas);

    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE))
    {
        console.log('Failed to intialize shaders.');
        return;
    }
    //Get attrib pointers to Assign the buffer object to a_Position variable
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    var a_Color    = gl.getAttribLocation(gl.program, 'a_Color');

    gl.clearColor( 0.0, 0.0, 0.0, 1.0 ); // black background

    //create buffers object
    var pointsBuf = gl.createBuffer();
    var colorsBuf = gl.createBuffer();

    function redraw(preserveColor)
    {
        //Clear both color and depth buffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        //Store the vertex data
        var points32 = generateTriangle(.95, 0, preserveColor);
        //set our strides and offsets
        var bpe = Float32Array.BYTES_PER_ELEMENT;

        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, pointsBuf);
		// Write date into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, points32, gl.STATIC_DRAW);
		// Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_Position);
        // Assign the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, bpe * 5, 0); 

        //bind colors to buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuf);
        gl.bufferData(gl.ARRAY_BUFFER, points32, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(a_Color);
        //The vertex buffer is 3 items long,
        //Has an stride between first-values of 5, and starts at 2 on each stride.
        gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, bpe * 5, bpe * 2); 

        //Draw the triangles
        gl.drawArrays(gl.TRIANGLES, 0, points32.length / 5);
    }
    redraw(false);
}
//Called from the HTML
function main() 
{
   //keept everything in a class.
    APP = new createAPP();
}
var APP;
