export const KEY_COLORS = { '祿': '#3fbf6f', '權': '#e0762f', '科': '#3f7fbf', '忌': '#d03555' };
export const KEY_SUFFIX = { '祿': 'lu', '權': 'quan', '科': 'ke', '忌': 'ji' };

// Module-level counter for unique SVG IDs to prevent marker ID collisions across multiple overlays
let _overlayCounter = 0;

// Constants for transformation key order for consistent arrow staggering
const KEY_ORDER_INDICES = { '祿': 0, '權': 1, '科': 2, '忌': 3 };

// Helper for creating SVG elements with correct namespace
function createSvgElement(tag, attributes = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attributes) {
        el.setAttribute(key, attributes[key]);
    }
    return el;
}

// --- Vector Math Helpers ---
function createPoint(x, y) { return { x, y }; }
function pointAdd(p1, p2) { return createPoint(p1.x + p2.x, p1.y + p2.y); }
function pointSubtract(p1, p2) { return createPoint(p1.x - p2.x, p1.y - p2.y); }
function pointScale(p, s) { return createPoint(p.x * s, p.y * s); }
function pointMagnitude(p) { return Math.sqrt(p.x * p.x + p.y * p.y); }
function pointNormalize(p) {
    const mag = pointMagnitude(p);
    return mag === 0 ? createPoint(0, 0) : pointScale(p, 1 / mag);
}
// Rotates a point 90 degrees counter-clockwise (useful for perpendicular vectors)
function pointRotate90(p) { return createPoint(-p.y, p.x); }

// Calculates a point on a quadratic Bezier curve at parameter t (0 to 1)
function quadraticPoint(p0, p1, p2, t) {
    const mt = 1 - t; // (1-t)
    const mt2 = mt * mt; // (1-t)^2
    const t2 = t * t;   // t^2
    const two_mt_t = 2 * mt * t; // 2(1-t)t

    return pointAdd(
        pointScale(p0, mt2),
        pointAdd(
            pointScale(p1, two_mt_t),
            pointScale(p2, t2)
        )
    );
}

/**
 * Creates and manages an SVG overlay for drawing Zi Wei Dou Shu "flying transformation" arrows.
 * @param {Array<Object>} gridPositions - Array of 12 objects {row, col} (1-based), indexed by branchIndex.
 * @param {Object} [options] - Optional settings.
 * @param {number} [options.size=560] - The size of the square chart layer in pixels.
 * @returns {Object} A controller object: { el, drawPalaceFlights, drawCenterFlights, clear }.
 */
export function createFlyOverlay(gridPositions, options = {}) {
    const overlayId = _overlayCounter++; // Unique ID for this overlay instance
    const size = options.size || 560;
    const cell = size / 4; // Size of each 140x140 palace cell

    // Main SVG element
    const el = createSvgElement('svg', {
        class: 'fly-overlay',
        viewBox: `0 0 ${size} ${size}`,
        width: '100%',
        height: '100%',
    });

    // <defs> element to contain arrow marker definitions
    const defs = createSvgElement('defs');
    // <g> group for all drawn arrows and labels, allows easy clearing
    const flyMarksGroup = createSvgElement('g', { class: 'fly-marks' });

    // Create arrow markers within the <defs>
    const markerUrls = {}; // Stores { '祿': 'url(#fly-arrow-lu-uid)', ... }
    for (const key in KEY_COLORS) {
        const id = `fly-arrow-${KEY_SUFFIX[key]}-${overlayId}`;
        markerUrls[key] = `url(#${id})`;

        const marker = createSvgElement('marker', {
            id: id,
            markerWidth: 7,
            markerHeight: 7,
            refX: 6,      // Reference point for the tip of the arrow
            refY: 3.5,    // Reference point for the center of the arrow
            orient: 'auto', // Arrowhead auto-orients to path direction
            markerUnits: 'strokeWidth', // Scales with the stroke-width of the path
        });
        const path = createSvgElement('path', {
            d: 'M0,0 L7,3.5 L0,7 Z', // Simple solid triangle path
            fill: KEY_COLORS[key],
        });
        marker.appendChild(path);
        defs.appendChild(marker);
    }

    el.appendChild(defs);
    el.appendChild(flyMarksGroup);

    // --- Geometry Helpers (scoped to this overlay instance) ---
    /**
     * Calculates the center coordinates of a palace cell.
     * @param {number} branchIndex - The 0-11 index of the palace.
     * @returns {Object} {x, y} coordinates of the palace center.
     */
    const getCenterOf = (branchIndex) => {
        const { row, col } = gridPositions[branchIndex];
        // (col - 0.5) * cell for x, (row - 0.5) * cell for y (1-based row/col)
        return createPoint((col - 0.5) * cell, (row - 0.5) * cell);
    };

    // Center of the entire chart layer
    const layerCenter = createPoint(size / 2, size / 2);

    /**
     * Draws "flying transformation" arrows originating from a specific palace.
     * @param {number} fromIndex - The branchIndex of the originating palace.
     * @param {Array<Object>} flights - An array of flight objects.
     *   Each object: { key: '祿'|'權'|'科'|'忌', star: string, toIndex: number|null }.
     */
    function drawPalaceFlights(fromIndex, flights) {
        const A = getCenterOf(fromIndex); // Starting point of the arrow

        // Draw source ring around the originating palace
        const sourceRing = createSvgElement('circle', {
            cx: A.x,
            cy: A.y,
            r: 12,
            fill: 'none',
            stroke: '#ffd700',
            'stroke-width': 1.5,
            opacity: 0.65,
        });
        flyMarksGroup.appendChild(sourceRing);

        flights.forEach(flight => {
            // Skip flights with no target palace
            if (flight.toIndex === null) return;

            const { key, star, toIndex } = flight;
            const color = KEY_COLORS[key];
            const markerUrl = markerUrls[key];
            const ki = KEY_ORDER_INDICES[key]; // For staggering

            let pathD;
            let labelPos;
            let finalB = null; // End point of the path after shortening (for normal flights)
            let ctrl = null;    // Control point for quadratic Bezier (for normal flights)

            if (toIndex === fromIndex) {
                // --- SELF-FLIGHT (looping arrow) ---
                // Circular arc path: 'M (startX, startY) A (rx ry x-axis-rotation large-arc-flag sweep-flag) (endX, endY)'
                // Start and end points are symmetrical around A.x, slightly above A.y
                const loopRadius = 20;
                const loopVerticalOffset = 10; // Vertical offset from A.y to the line segment
                const startX = A.x - 14;
                const startY = A.y - loopVerticalOffset;
                const endX = A.x + 14;
                const endY = A.y - loopVerticalOffset;

                // A 20 20 0 1 0: circular arc, radius 20, no x-axis rotation, large arc, counter-clockwise sweep.
                // This draws an arc downwards from (startX, startY) to (endX, endY),
                // so its lowest point is near A.y, as requested.
                pathD = `M ${startX} ${startY} A ${loopRadius} ${loopRadius} 0 1 0 ${endX} ${endY}`;
                
                // Label position: above the highest point of the loop (startY)
                labelPos = createPoint(A.x, startY - 20); // 20px above the start/end line
            } else {
                // --- NORMAL FLIGHT (quadratic Bezier arrow) ---
                const B = getCenterOf(toIndex); // End point of the arrow

                // Midpoint between A and B
                const mid = createPoint((A.x + B.x) / 2, (A.y + B.y) / 2);

                // Calculate base control point: pull midpoint 45% towards the layer center
                // base = mid + (C - mid) * 0.45
                const vecMidToC = pointSubtract(layerCenter, mid); // Vector from mid to layerCenter
                const baseCtrl = pointAdd(mid, pointScale(vecMidToC, 0.45));

                // Calculate offset vector perpendicular to (B - A)
                const vecAToB = pointSubtract(B, A); // Vector from A to B
                const perpVec = pointNormalize(pointRotate90(vecAToB)); // Normalized perpendicular vector

                // Stagger arrows based on key type (祿, 權, 科, 忌)
                const offsetAmount = (ki - 1.5) * 14; // ki is 0,1,2,3 resulting in offsets -21, -7, 7, 21
                ctrl = pointAdd(baseCtrl, pointScale(perpVec, offsetAmount));

                // Shorten the path end slightly so the arrowhead doesn't sit under target text.
                // Move B 12px back along the (ctrl -> B) direction.
                const vecCtrlToB = pointSubtract(B, ctrl);
                finalB = pointSubtract(B, pointScale(pointNormalize(vecCtrlToB), 12));

                pathD = `M ${A.x},${A.y} Q ${ctrl.x},${ctrl.y} ${finalB.x},${finalB.y}`;
                // Label at the midpoint of the Bezier curve
                labelPos = quadraticPoint(A, ctrl, finalB, 0.5);
            }

            // Create the path element for the arrow
            const pathEl = createSvgElement('path', {
                d: pathD,
                stroke: color,
                'stroke-width': 2.5,
                fill: 'none',
                opacity: 0.9,
                'stroke-linecap': 'round',
                'marker-end': markerUrl, // Apply the specific arrowhead marker
            });
            // Add a title element for tooltip functionality (layered reading when provided)
            const titleEl = createSvgElement('title');
            titleEl.textContent = flight.title || `${star}化${key}`;
            pathEl.appendChild(titleEl);
            flyMarksGroup.appendChild(pathEl);

            // Create the text label for the arrow
            const textEl = createSvgElement('text', {
                x: labelPos.x,
                y: labelPos.y,
                'font-size': 13,
                'text-anchor': 'middle', // Centers text horizontally
                fill: color,
                stroke: '#0a1024',
                'stroke-width': 3,
                'paint-order': 'stroke', // Ensures stroke is drawn under fill for sharp text
                'font-weight': 'bold',
            });
            textEl.textContent = `${star}${key}`;
            flyMarksGroup.appendChild(textEl);
        });
    }

    /**
     * Draws "flying transformation" arrows originating from the layer center.
     * @param {Array<Object>} targets - An array of flight objects.
     *   Each object: { key: '祿'|'權'|'科'|'忌', star: string, toIndex: number|null }.
     */
    function drawCenterFlights(targets) {
        // Draw a small filled gold dot at the layer center once per call
        const centerDot = createSvgElement('circle', {
            cx: layerCenter.x,
            cy: layerCenter.y,
            r: 4,
            fill: '#ffd700',
            opacity: 0.8,
        });
        flyMarksGroup.appendChild(centerDot);

        targets.forEach(flight => {
            // Skip flights with no target palace
            if (flight.toIndex === null) return;

            const { key, star, toIndex } = flight;
            const color = KEY_COLORS[key];
            const markerUrl = markerUrls[key];
            const ki = KEY_ORDER_INDICES[key];

            const A = layerCenter; // Starting point is the layer center
            const B = getCenterOf(toIndex); // End point is a palace center

            const mid = createPoint((A.x + B.x) / 2, (A.y + B.y) / 2);

            // Control point for center flights: midpoint(C, B) offset perpendicular
            // No pull towards layer center needed as A is already the center.
            const vecAToB = pointSubtract(B, A);
            const perpVec = pointNormalize(pointRotate90(vecAToB));
            const offsetAmount = (ki - 1.5) * 14;
            const ctrl = pointAdd(mid, pointScale(perpVec, offsetAmount));

            // Shorten the path end
            const vecCtrlToB = pointSubtract(B, ctrl);
            const finalB = pointSubtract(B, pointScale(pointNormalize(vecCtrlToB), 12));

            const pathD = `M ${A.x},${A.y} Q ${ctrl.x},${ctrl.y} ${finalB.x},${finalB.y}`;

            const pathEl = createSvgElement('path', {
                d: pathD,
                stroke: color,
                'stroke-width': 2.5,
                fill: 'none',
                opacity: 0.9,
                'stroke-linecap': 'round',
                'marker-end': markerUrl,
            });
            const titleEl = createSvgElement('title');
            titleEl.textContent = `${star}化${key}`;
            pathEl.appendChild(titleEl);
            flyMarksGroup.appendChild(pathEl);

            const labelPos = quadraticPoint(A, ctrl, finalB, 0.5);
            const textEl = createSvgElement('text', {
                x: labelPos.x,
                y: labelPos.y,
                'font-size': 13,
                'text-anchor': 'middle',
                fill: color,
                stroke: '#0a1024',
                'stroke-width': 3,
                'paint-order': 'stroke',
                'font-weight': 'bold',
            });
            textEl.textContent = `${star}${key}`;
            flyMarksGroup.appendChild(textEl);
        });
    }

    /**
     * Draws a straight dashed link between two palaces (used for 疊宮 沖 events).
     * @param {number} fromIndex - branchIndex of the acting palace (e.g. where the 忌 sits).
     * @param {number} toIndex - branchIndex of the palace being hit (e.g. the 沖-ed 命宮).
     * @param {Object} [opts] - { key: mutagen key for color/marker (default '忌'), label }.
     */
    function drawLink(fromIndex, toIndex, opts = {}) {
        const key = opts.key || '忌';
        const color = KEY_COLORS[key];
        const A = getCenterOf(fromIndex);
        const B = getCenterOf(toIndex);
        // Shorten both ends so the line doesn't sit under palace text
        const dir = pointNormalize(pointSubtract(B, A));
        const start = pointAdd(A, pointScale(dir, 16));
        const end = pointSubtract(B, pointScale(dir, 16));

        const pathEl = createSvgElement('path', {
            d: `M ${start.x},${start.y} L ${end.x},${end.y}`,
            stroke: color,
            'stroke-width': 2.5,
            'stroke-dasharray': '7 5',
            fill: 'none',
            opacity: 0.9,
            'stroke-linecap': 'round',
            'marker-end': markerUrls[key],
        });
        flyMarksGroup.appendChild(pathEl);

        if (opts.label) {
            const mid = createPoint((start.x + end.x) / 2, (start.y + end.y) / 2);
            const textEl = createSvgElement('text', {
                x: mid.x,
                y: mid.y - 6,
                'font-size': 14,
                'text-anchor': 'middle',
                fill: color,
                stroke: '#0a1024',
                'stroke-width': 3,
                'paint-order': 'stroke',
                'font-weight': 'bold',
            });
            textEl.textContent = opts.label;
            flyMarksGroup.appendChild(textEl);
        }
    }

    /**
     * Clears all drawn arrows and labels from the overlay.
     */
    function clear() {
        while (flyMarksGroup.firstChild) {
            flyMarksGroup.removeChild(flyMarksGroup.firstChild);
        }
    }

    // Return the controller object with the SVG element and control methods
    return {
        el,
        drawPalaceFlights,
        drawCenterFlights,
        drawLink,
        clear,
    };
}
