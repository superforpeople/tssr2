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
    
    const widthSlider = document.getElementById("width-slider");
    const heightSlider = document.getElementById("height-slider");
    
    const strokeSlider = document.getElementById("stroke-slider");
    const taperSlider = document.getElementById("taper-slider");
    const individualitySlider = document.getElementById("individuality-slider");
    
    const randomizeBtn = document.getElementById("randomize-btn");
    const exportBtn = document.getElementById("export-btn");
    
    let baseParams = {};
    
    function bindSlider(slider) {
        const span = document.getElementById(slider.id.replace("-slider", "-val"));
        slider.addEventListener("input", () => {
            span.textContent = slider.value;
            drawPaths();
        });
    }
    
    const allSliders = [
        pointsSlider, freqXSlider, freqYSlider, modulationSlider, roundnessSlider,
        widthSlider, heightSlider, strokeSlider, taperSlider, individualitySlider
    ];
    
    allSliders.forEach(bindSlider);
    
    randomizeBtn.addEventListener("click", () => {
        // Randomize the aesthetic sliders, but leave stroke styles manual.
        pointsSlider.value = Math.floor(Math.random() * 20 + 3);
        freqXSlider.value = (0.5 + Math.random() * 3.5).toFixed(1);
        freqYSlider.value = (0.5 + Math.random() * 3.5).toFixed(1);
        modulationSlider.value = (Math.random() * 0.8).toFixed(2);
        roundnessSlider.value = (0.2 + Math.random() * 0.8).toFixed(2);
        
        // Slightly constrain random widths
        widthSlider.value = Math.floor(60 + Math.random() * 140);
        heightSlider.value = Math.floor(60 + Math.random() * 140);
        
        allSliders.forEach(slider => {
            document.getElementById(slider.id.replace("-slider", "-val")).textContent = slider.value;
        });
        
        generateNewPhases();
        drawPaths();
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
    }
    
    function perturb(base, ind) {
        if (ind === 0) return base;
        
        const shiftPhaseAmount = ind * 0.2; 
        const shiftMultAmount = ind * 0.1;
        
        const shiftPhase = (val) => val + (Math.random() * 2 - 1) * shiftPhaseAmount;
        const shiftMult = (val) => val + (Math.random() * 2 - 1) * shiftMultAmount * val;
        
        return {
            fXMult: shiftMult(base.fXMult),
            fYMult: shiftMult(base.fYMult),
            phaseX1: shiftPhase(base.phaseX1),
            phaseX2: shiftPhase(base.phaseX2),
            phaseY1: shiftPhase(base.phaseY1),
            phaseY2: shiftPhase(base.phaseY2)
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
        
        const points = [];
        const samples = 400;
        
        for (let i = 0; i < samples; i++) {
            let t = (i / (samples - 1)) * maxT;
            
            // X components
            let nx1 = Math.sin(fX1 * t + phases.phaseX1);
            let nx2 = Math.sin(fX2 * t + phases.phaseX2);
            let nx = shapeFn(nx1) * (1 - mod) + shapeFn(nx2) * mod;
            
            // Y components
            let ny1 = Math.cos(fY1 * t + phases.phaseY1);
            let ny2 = Math.cos(fY2 * t + phases.phaseY2);
            let ny = shapeFn(ny1) * (1 - mod) + shapeFn(ny2) * mod;
            
            let x = -halfW + nx * halfW;
            let y = -halfH + ny * halfH;
            
            points.push({x, y});
        }
        return points;
    }
    
    function convertToTaperedPath(points, baseThickness, taperRatio) {
        if (points.length < 2) return "";

        const len = points.length;
        let pathLeft = [];
        let pathRight = [];
        
        let last_nx = 0;
        let last_ny = 0;

        for (let i = 0; i < len; i++) {
            let t = i / (len - 1);
            let sineShape = Math.sin(t * Math.PI); 
            let taperVal = (1.0 - taperRatio) + (sineShape * taperRatio);
            let radius = (baseThickness / 2) * taperVal;

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

        let d = `M ${pathLeft[0].x.toFixed(2)} ${pathLeft[0].y.toFixed(2)}`;
        for (let i = 1; i < pathLeft.length; i++) {
            d += ` L ${pathLeft[i].x.toFixed(2)} ${pathLeft[i].y.toFixed(2)}`;
        }
        for (let i = 0; i < pathRight.length; i++) {
            d += ` L ${pathRight[i].x.toFixed(2)} ${pathRight[i].y.toFixed(2)}`;
        }
        d += " Z";
        return d;
    }
    
    function drawPaths() {
        const w = parseInt(widthSlider.value);
        const h = parseInt(heightSlider.value);
        const thickness = parseFloat(strokeSlider.value);
        const taper = parseFloat(taperSlider.value);
        const ind = parseFloat(individualitySlider.value);
        
        for (let i = 0; i < 4; i++) {
            let phases = perturb(baseParams, ind);
            let pts = generatePointsSequence(phases, w, h);
            let d = convertToTaperedPath(pts, thickness, taper);
            paths[i].setAttribute("d", d);
        }
    }
    
    function exportSVG() {
        const exportSvg = document.createElementNS(svgNS, "svg");
        exportSvg.setAttribute("viewBox", "-250 -250 500 500");
        exportSvg.setAttribute("xmlns", svgNS);
        
        const group = document.createElementNS(svgNS, "g");
        
        for (let i = 0; i < 4; i++) {
            const newPath = document.createElementNS(svgNS, "path");
            newPath.setAttribute("d", paths[i].getAttribute("d"));
            newPath.setAttribute("transform", paths[i].getAttribute("transform"));
            newPath.setAttribute("fill", "#000000"); 
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
