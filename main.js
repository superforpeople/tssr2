document.addEventListener("DOMContentLoaded", () => {
    const svgContainer = document.getElementById("svg-container");
    
    // Create base SVG element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "-250 -250 500 500");
    svg.setAttribute("id", "main-svg");
    
    const transforms = [
        "scale(1, 1)",      
        "scale(-1, 1)",     
        "scale(1, -1)",     
        "scale(-1, -1)"     
    ];
    
    // Create Background Image Node
    const bgImage = document.createElementNS(svgNS, "image");
    bgImage.setAttribute("x", "-250");
    bgImage.setAttribute("y", "-250");
    bgImage.setAttribute("width", "500");
    bgImage.setAttribute("height", "500");
    bgImage.setAttribute("preserveAspectRatio", "xMidYMid slice");
    bgImage.setAttribute("href", "bg.jpg");
    svg.appendChild(bgImage);
    
    const paths = [];
    
    transforms.forEach(t => {
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("transform", t);
        path.setAttribute("fill", "#000000");
        path.setAttribute("stroke", "none"); 
        path.style.transition = "d 0.05s linear"; 
        svg.appendChild(path);
        paths.push(path);
    });
    
    svgContainer.appendChild(svg);
    
    // Sliders
    const pointsSlider = document.getElementById("points-slider");
    const freqXSlider = document.getElementById("freq-x-slider");
    const freqYSlider = document.getElementById("freq-y-slider");
    const modulationSlider = document.getElementById("modulation-slider");
    const roundnessSlider = document.getElementById("roundness-slider");
    const noiseSlider = document.getElementById("noise-slider");
    const waveformSelect = document.getElementById("waveform-select");
    
    const strokeSlider = document.getElementById("stroke-slider");
    const taperMinSlider = document.getElementById("taper-min-slider");
    const taperMaxSlider = document.getElementById("taper-max-slider");
    const individualitySlider = document.getElementById("individuality-slider");
    
    const randomizeBtn = document.getElementById("randomize-btn");
    const exportBtn = document.getElementById("export-btn");
    
    const animateCheckbox = document.getElementById("animate-checkbox");
    const durationSlider = document.getElementById("duration-slider");
    const easingSelect = document.getElementById("easing-select");
    
    const colorPicker = document.getElementById("color-picker");
    const bgUpload = document.getElementById("bg-upload");
    
    let baseParams = {};
    let pathOffsets = [];
    let isAnimating = false;
    let animationStartTime = null;
    let currentAnimFrame = null;
    
    function bindSlider(slider) {
        const span = document.getElementById(slider.id.replace("-slider", "-val"));
        slider.addEventListener("input", () => {
            if (span) span.textContent = slider.value;
            if (!isAnimating) {
                drawPaths(1.0);
            }
        });
    }
    
    const allSliders = [
        pointsSlider, freqXSlider, freqYSlider, modulationSlider, roundnessSlider, noiseSlider,
        strokeSlider, taperMinSlider, taperMaxSlider, individualitySlider
    ];
    
    allSliders.forEach(bindSlider);
    
    if (waveformSelect) {
        waveformSelect.addEventListener("change", () => {
            if (!isAnimating) drawPaths(1.0);
        });
    }
    
    if (animateCheckbox) {
        animateCheckbox.addEventListener("change", (e) => {
            isAnimating = e.target.checked;
            if (isAnimating) {
                animationStartTime = performance.now();
                if (!currentAnimFrame) {
                    currentAnimFrame = requestAnimationFrame(animationLoop);
                }
            } else {
                if (currentAnimFrame) {
                    cancelAnimationFrame(currentAnimFrame);
                    currentAnimFrame = null;
                }
                drawPaths(1.0);
            }
        });
        
        durationSlider.addEventListener("input", () => {
            document.getElementById("duration-val").textContent = durationSlider.value;
        });
    }

    function animationLoop(time) {
        if (!isAnimating) {
            currentAnimFrame = null;
            return;
        }
        
        const duration = parseFloat(durationSlider.value) * 1000;
        let elapsed = (time - animationStartTime) % (duration * 2); 
        let t = elapsed / duration;
        let rawProgress = t <= 1 ? t : 2 - t; 
        
        let progress = applyEasing(rawProgress, easingSelect.value);
        
        drawPaths(progress);
        currentAnimFrame = requestAnimationFrame(animationLoop);
    }
    
    function applyEasing(t, type) {
        switch(type) {
            case "easeIn": return t * t * t; 
            case "easeOut": return 1 - Math.pow(1 - t, 3);
            case "easeInOut": return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            case "linear":
            default: return t;
        }
    }
    
    if (colorPicker) {
        colorPicker.addEventListener("input", (e) => {
            paths.forEach(p => p.setAttribute("fill", e.target.value));
        });
        paths.forEach(p => p.setAttribute("fill", colorPicker.value));
    }

    if (bgUpload) {
        bgUpload.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    bgImage.setAttribute("href", event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    randomizeBtn.addEventListener("click", () => {
        // Only change the drawing generation paths by picking new random phases.
        // Keep all user-adjusted slider parameters exactly the same.
        generateNewPhases();
        if (!isAnimating) {
            drawPaths(1.0);
        }
    });
    
    exportBtn.addEventListener("click", exportSVG);
    
    function generateNewPhases() {
        // We only generate new phases and frequency modulators linearly to establish a new topological curve shape
        baseParams = {
            fXMult: 1.0 + Math.random(),
            fYMult: 1.0 + Math.random(),
            phaseX1: Math.random() * Math.PI * 2,
            phaseX2: Math.random() * Math.PI * 2,
            phaseY1: Math.random() * Math.PI * 2,
            phaseY2: Math.random() * Math.PI * 2,
        };
        
        pathOffsets = [];
        for (let i = 0; i < 4; i++) {
            pathOffsets.push({
                fX: Math.random() * 2 - 1,
                fY: Math.random() * 2 - 1,
                pX1: Math.random() * 2 - 1,
                pX2: Math.random() * 2 - 1,
                pY1: Math.random() * 2 - 1,
                pY2: Math.random() * 2 - 1,
            });
        }
    }
    
    function perturb(base, ind, offset) {
        if (ind === 0 || !offset) return base;
        
        const shiftPhaseAmount = ind * 0.2; 
        const shiftMultAmount = ind * 0.1;
        
        return {
            fXMult: base.fXMult + offset.fX * shiftMultAmount * base.fXMult,
            fYMult: base.fYMult + offset.fY * shiftMultAmount * base.fYMult,
            phaseX1: base.phaseX1 + offset.pX1 * shiftPhaseAmount,
            phaseX2: base.phaseX2 + offset.pX2 * shiftPhaseAmount,
            phaseY1: base.phaseY1 + offset.pY1 * shiftPhaseAmount,
            phaseY2: base.phaseY2 + offset.pY2 * shiftPhaseAmount
        };
    }
    
    function generatePointsSequence(phases, w, h) {
        const margin = 5;
        const halfW = (w - margin) / 2;
        const halfH = (h - margin) / 2;
        
        // Grab live UI values
        const complexity = parseInt(pointsSlider.value);
        const maxT = Math.PI + (complexity * 0.4);
        
        const fX1 = parseFloat(freqXSlider.value);
        const fX2 = fX1 * phases.fXMult;
        
        const fY1 = parseFloat(freqYSlider.value);
        const fY2 = fY1 * phases.fYMult;
        
        const mod = parseFloat(modulationSlider.value);
        const roundness = parseFloat(roundnessSlider.value);
        
        // Roundness determines power mapping: 1.0 = normal (sin^1), < 1.0 translates to sharp peaks (sin^3)
        // If roundness is 0, p = 3. If roundness is 1, p = 1.
        let p = 1 + (1 - roundness) * 2;
        
        const shapeFn = (val) => {
            return (val < 0 ? -1 : 1) * Math.pow(Math.abs(val), p);
        };
        
        const waveform = waveformSelect ? waveformSelect.value : "sine";
        const noiseLevel = noiseSlider ? parseFloat(noiseSlider.value) : 0;
        
        const waveFn = (v, isCos) => {
            let val = isCos ? Math.cos(v) : Math.sin(v);
            switch(waveform) {
                case "triangle":
                    return (2 / Math.PI) * Math.asin(val);
                case "square":
                    return (2 / Math.PI) * Math.atan(val * 15);
                case "bounce":
                    return Math.abs(val) * 2 - 1;
                case "harmonic":
                    // A complex waveform made of multiple harmonics
                    let val2 = isCos ? Math.cos(v * 3) : Math.sin(v * 3);
                    return (val + 0.3 * val2) / 1.3;
                case "sine":
                default:
                    return val;
            }
        };
        
        const points = [];
        const samples = 400;
        
        for (let i = 0; i < samples; i++) {
            let t = (i / (samples - 1)) * maxT;
            
            // X components
            let nx1 = waveFn(fX1 * t + phases.phaseX1, false);
            let nx2 = waveFn(fX2 * t + phases.phaseX2, false);
            let nx = shapeFn(nx1) * (1 - mod) + shapeFn(nx2) * mod;
            
            // Y components
            let ny1 = waveFn(fY1 * t + phases.phaseY1, true);
            let ny2 = waveFn(fY2 * t + phases.phaseY2, true);
            let ny = shapeFn(ny1) * (1 - mod) + shapeFn(ny2) * mod;
            
            // Appy Noise/Jitter
            if (noiseLevel > 0) {
                nx += Math.sin(t * 40 + phases.phaseX1 * 10) * noiseLevel * 0.2;
                ny += Math.cos(t * 41 + phases.phaseY1 * 10) * noiseLevel * 0.2;
            }
            
            let x = -halfW + nx * halfW;
            let y = -halfH + ny * halfH;
            
            points.push({x, y});
        }
        return points;
    }
    
    function convertToTaperedPath(points, baseThickness, taperMin, taperMax, progress = 1.0) {
        if (points.length < 2 || progress <= 0) return "";
        
        const len = points.length;
        let targetFloatIndex = progress * (len - 1);
        let maxIndex = Math.floor(targetFloatIndex);

        let pathLeft = [];
        let pathRight = [];
        
        let last_nx = 0;
        let last_ny = 0;
        
        let rStart = 0;
        let rEnd = 0;

        for (let i = 0; i <= maxIndex; i++) {
            let t = i / (len - 1);
            let sineShape = Math.sin(t * Math.PI); 
            let taperVal = taperMin + sineShape * (taperMax - taperMin);
            let radius = (baseThickness / 2) * taperVal;
            
            if (i === 0) rStart = radius;
            if (i === maxIndex && targetFloatIndex === maxIndex) rEnd = radius;

            let dx, dy;
            if (i === 0) {
                dx = points[1].x - points[0].x;
                dy = points[1].y - points[0].y;
            } else if (i === len - 1) {
                dx = points[len-1].x - points[len-2].x;
                dy = points[len-1].y - points[len-2].y;
            } else {
                dx = points[i+1].x - points[i-1].x;
                dy = points[i+1].y - points[i-1].y;
            }

            let dist = Math.sqrt(dx*dx + dy*dy);
            let nx, ny;
            if (dist < 0.0001) {
                nx = last_nx;
                ny = last_ny;
            } else {
                nx = -dy / dist;
                ny = dx / dist;
            }
            
            last_nx = nx;
            last_ny = ny;

            pathLeft.push({ x: points[i].x + nx * radius, y: points[i].y + ny * radius });
            pathRight.unshift({ x: points[i].x - nx * radius, y: points[i].y - ny * radius });
        }
        
        let remainder = targetFloatIndex - maxIndex;
        if (remainder > 0 && maxIndex + 1 < len) {
            let i = maxIndex;
            let nextI = maxIndex + 1;
            
            let t = targetFloatIndex / (len - 1);
            let sineShape = Math.sin(t * Math.PI); 
            let taperVal = taperMin + sineShape * (taperMax - taperMin);
            let radius = (baseThickness / 2) * taperVal;
            
            rEnd = radius;
            
            let interpX = points[i].x + (points[nextI].x - points[i].x) * remainder;
            let interpY = points[i].y + (points[nextI].y - points[i].y) * remainder;
            
            let nx = last_nx;
            let ny = last_ny;
            
            pathLeft.push({ x: interpX + nx * radius, y: interpY + ny * radius });
            pathRight.unshift({ x: interpX - nx * radius, y: interpY - ny * radius });
        }

        let d = `M ${pathLeft[0].x.toFixed(2)} ${pathLeft[0].y.toFixed(2)}`;
        for (let i = 1; i < pathLeft.length; i++) {
            d += ` L ${pathLeft[i].x.toFixed(2)} ${pathLeft[i].y.toFixed(2)}`;
        }
        
        // End Cap (rounded)
        if (rEnd > 0.01) {
            d += ` A ${rEnd.toFixed(2)} ${rEnd.toFixed(2)} 0 0 0 ${pathRight[0].x.toFixed(2)} ${pathRight[0].y.toFixed(2)}`;
        } else {
            d += ` L ${pathRight[0].x.toFixed(2)} ${pathRight[0].y.toFixed(2)}`;
        }

        for (let i = 1; i < pathRight.length; i++) {
            d += ` L ${pathRight[i].x.toFixed(2)} ${pathRight[i].y.toFixed(2)}`;
        }
        
        // Start Cap (rounded)
        if (rStart > 0.01) {
            let lastRight = pathRight[pathRight.length - 1];
            d += ` A ${rStart.toFixed(2)} ${rStart.toFixed(2)} 0 0 0 ${pathLeft[0].x.toFixed(2)} ${pathLeft[0].y.toFixed(2)}`;
        } else {
            d += " Z";
        }

        return d;
    }
    
    function drawPaths(progress = 1.0) {
        const w = 230;
        const h = 230;
        const thickness = parseFloat(strokeSlider.value);
        const tMin = parseFloat(taperMinSlider.value);
        const tMax = parseFloat(taperMaxSlider.value);
        const ind = parseFloat(individualitySlider.value);
        
        for (let i = 0; i < 4; i++) {
            let phases = perturb(baseParams, ind, pathOffsets[i]);
            let pts = generatePointsSequence(phases, w, h);
            let d = convertToTaperedPath(pts, thickness, tMin, tMax, progress);
            paths[i].setAttribute("d", d);
        }
    }
    
    function exportSVG() {
        const exportSvg = document.createElementNS(svgNS, "svg");
        exportSvg.setAttribute("viewBox", "-250 -250 500 500");
        exportSvg.setAttribute("xmlns", svgNS);
        
        const group = document.createElementNS(svgNS, "g");
        
        // Include background if present
        if (bgImage.hasAttribute("href")) {
            const exportBg = bgImage.cloneNode(true);
            group.appendChild(exportBg);
        }
        
        const currentColor = colorPicker ? colorPicker.value : "#000000";
        
        for (let i = 0; i < 4; i++) {
            const newPath = document.createElementNS(svgNS, "path");
            newPath.setAttribute("d", paths[i].getAttribute("d"));
            newPath.setAttribute("transform", paths[i].getAttribute("transform"));
            newPath.setAttribute("fill", currentColor); 
            newPath.setAttribute("stroke", "none");
            group.appendChild(newPath);
        }
        
        exportSvg.appendChild(group);
        
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(exportSvg);
        svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgString;
        
        const blob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tss-r2-pattern.svg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    generateNewPhases();
    drawPaths();
});
