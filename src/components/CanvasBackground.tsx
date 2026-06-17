import { useEffect, useRef } from "react";

interface CanvasBackgroundProps {
  isDark: boolean;
}

export default function CanvasBackground({ isDark }: CanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    // Vertex Shader
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader (2D Simplex Noise with light/dark blend)
    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_dark_mode; // 0.0 for light, 1.0 for dark
      varying vec2 v_texCoord;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
          dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = v_texCoord;
        
        // Multi-layered noise motion
        float n1 = snoise(uv * 1.5 + u_time * 0.05);
        float n2 = snoise(uv * 3.0 - u_time * 0.08 + n1);
        
        // Light mode colors
        vec3 l_col_base = vec3(0.91, 0.99, 0.95);  // Warm soft light emerald (#e7fff3)
        vec3 l_col_wave1 = vec3(0.74, 0.96, 0.86); // Soft mint glass (#bbfbe1)
        vec3 l_col_wave2 = vec3(0.63, 0.92, 0.79); // Accent mint shade
        
        // Dark mode colors
        vec3 d_col_base = vec3(0.02, 0.09, 0.05);  // deep forest black (#06160e)
        vec3 d_col_wave1 = vec3(0.04, 0.18, 0.11); // deeper glowing forest
        vec3 d_col_wave2 = vec3(0.06, 0.25, 0.16); // emerald glowing hue
        
        // Interpolate colors based on dark mode uniform
        vec3 col_base = mix(l_col_base, d_col_base, u_dark_mode);
        vec3 col_wave1 = mix(l_col_wave1, d_col_wave1, u_dark_mode);
        vec3 col_wave2 = mix(l_col_wave2, d_col_wave2, u_dark_mode);
        
        // Combine base color and wave elements based on noise
        vec3 finalColor = mix(col_base, col_wave1, n1 * 0.4 + 0.4);
        finalColor = mix(finalColor, col_wave2, n2 * 0.25);
        
        // Vignette / subtle ambient zoom
        float l = length(uv - 0.5);
        finalColor += (1.0 - l) * mix(0.05, 0.02, u_dark_mode);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    function compileShader(source: string, type: number): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation failed: ", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking failed: ", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Set geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const darkModeLoc = gl.getUniformLocation(program, "u_dark_mode");

    let animationId: number;
    let localTime = 0;

    // Synchronize canvas size with layout
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width || canvas.clientWidth || 1280;
        const height = entry.contentRect.height || canvas.clientHeight || 720;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    });

    resizeObserver.observe(canvas);

    // Render loop
    const render = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);

      localTime += 0.5;
      if (timeLoc) gl.uniform1f(timeLoc, localTime * 0.05);
      if (resLoc) gl.uniform2f(resLoc, canvas.width, canvas.height);
      if (darkModeLoc) gl.uniform1f(darkModeLoc, isDark ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none transition-all duration-700"
      style={{ opacity: isDark ? 0.35 : 0.6 }}
      id="shader-canvas-BACKGROUND"
    />
  );
}
