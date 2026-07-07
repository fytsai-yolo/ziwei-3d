/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export class Scene {
    /**
     * @param {HTMLElement} viewportEl The DOM element serving as the 3D viewport.
     */
    constructor(viewportEl) {
        this.viewportEl = viewportEl;

        this.stageEl = document.createElement('div');
        this.stageEl.className = 'stage';
        this.stackEl = document.createElement('div');
        this.stackEl.className = 'stack';
        this.stageEl.appendChild(this.stackEl);
        this.viewportEl.appendChild(this.stageEl);

        // Scene state
        this.rotX = -60; // Initial X rotation
        this.rotZ = 45;  // Initial Z rotation
        this.zoom = 0.9; // Initial zoom scale
        this.spacing = 120; // Default spacing between layers
        this.layerWraps = []; // Array of layer-wrap elements

        // Interaction state
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.movedDistance = 0; // To differentiate drag from click
        this.pinnedBranchIndex = null; // null or the index of the currently pinned branch

        this._applyTransforms();
        this._setupEventListeners();
    }

    /** Applies current transform values to the stack and individual layers. */
    _applyTransforms() {
        this.stackEl.style.transform = `scale(${this.zoom}) rotateX(${this.rotX}deg) rotateZ(${this.rotZ}deg)`;

        const n = this.layerWraps.length;
        this.layerWraps.forEach((wrap, i) => {
            // Centers the stack on the stage's midplane for rotation.
            // i - (n-1)/2 makes the middle layer's offset 0.
            wrap.style.transform = `translate(-50%, -50%) translateZ(${(i - (n - 1) / 2) * this.spacing}px)`;
        });
    }

    /** Sets up event listeners for user interactions. */
    _setupEventListeners() {
        this.viewportEl.addEventListener('pointerdown', this._onPointerDown.bind(this));
        this.viewportEl.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
        this.viewportEl.addEventListener('pointerover', this._onPointerOver.bind(this));
        this.viewportEl.addEventListener('pointerout', this._onPointerOut.bind(this));
        // No 'click' listener: pointer capture retargets mouse events to the viewport,
        // so taps are detected manually in _onPointerUp using the pointerdown target.
    }

    /**
     * Handles pointer down event to start dragging.
     * @param {PointerEvent} e
     */
    _onPointerDown(e) {
        if (e.button !== 0) return; // Only left mouse button
        this.isDragging = true;
        this.downTarget = e.target; // remember the real target before capture retargets events
        this.viewportEl.setPointerCapture(e.pointerId);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.movedDistance = 0;

        // Bind move and up listeners to the viewport once dragging starts
        this.viewportEl.addEventListener('pointermove', this._onPointerMove);
        this.viewportEl.addEventListener('pointerup', this._onPointerUp);
    }

    /**
     * Handles pointer move event for rotating the stack.
     * Use an arrow function to maintain `this` context.
     * @param {PointerEvent} e
     */
    _onPointerMove = (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;

        this.movedDistance += Math.abs(dx) + Math.abs(dy); // Accumulate distance for drag/click distinction

        this.rotZ += dx * 0.4;
        this.rotX = clamp(this.rotX + dy * 0.4, -90, 0); // Clamp X rotation to prevent flipping
        this._applyTransforms();
    }

    /**
     * Handles pointer up event to stop dragging.
     * Use an arrow function to maintain `this` context.
     * @param {PointerEvent} e
     */
    _onPointerUp = (e) => {
        this.isDragging = false;
        this.viewportEl.releasePointerCapture(e.pointerId);
        // Remove move and up listeners
        this.viewportEl.removeEventListener('pointermove', this._onPointerMove);
        this.viewportEl.removeEventListener('pointerup', this._onPointerUp);
        // A press that barely moved is a tap; handle it against the pointerdown target
        if (this.movedDistance <= 4 && this.downTarget) {
            this._handleTap(this.downTarget);
        }
        this.downTarget = null;
    }

    /**
     * Handles wheel event for zooming in/out.
     * @param {WheelEvent} e
     */
    _onWheel(e) {
        e.preventDefault(); // Prevent page scrolling
        this.zoom = clamp(this.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 0.3, 2.5);
        this._applyTransforms();
    }

    /**
     * Handles pointer over event for highlighting palaces on hover.
     * @param {PointerEvent} e
     */
    _onPointerOver(e) {
        if (this.pinnedBranchIndex !== null) return; // Don't highlight on hover if a branch is pinned

        const palaceEl = e.target.closest('.palace');
        if (palaceEl) {
            const branchIndex = parseInt(palaceEl.dataset.branchIndex, 10);
            const layerId = e.target.closest('.layer')?.dataset.layerId ?? null;
            this.highlight(branchIndex, layerId, 'hover');
        } else {
            // If pointer moves over the viewport but not over a palace, clear hover highlight
            this.highlight(null, null, 'hover');
        }
    }

    /**
     * Handles pointer out event for removing highlight when leaving palaces.
     * @param {PointerEvent} e
     */
    _onPointerOut(e) {
        if (this.pinnedBranchIndex !== null) return; // Don't remove highlight if pinned

        // If the element we are leaving is a palace AND
        // the element we are entering is NOT a palace, then clear highlight.
        // This covers moving from a palace to a non-palace area (inside or outside stack)
        // It also ensures moving from palace A -> palace B doesn't clear.
        if (e.target.closest('.palace') && !e.relatedTarget?.closest('.palace')) {
            this.highlight(null, null, 'hover');
        }
    }

    /**
     * Handles a tap (non-drag press) for pinning/unpinning a branch or selecting a layer center.
     * @param {Element} target The element the pointer went down on.
     */
    _handleTap(target) {
        const layerId = target.closest('.layer')?.dataset.layerId ?? null;
        const palaceEl = target.closest('.palace');
        if (palaceEl) {
            const branchIndex = parseInt(palaceEl.dataset.branchIndex, 10);
            if (this.pinnedBranchIndex === branchIndex) {
                // Clicking the same index unpins it
                this.pinnedBranchIndex = null;
                this.highlight(null, null, 'click');
            } else {
                // Pin the new branch index
                this.pinnedBranchIndex = branchIndex;
                this.highlight(branchIndex, layerId, 'click');
            }
            return;
        }
        // Tap on a layer's center area: let listeners draw that layer's own 四化
        if (target.closest('.layer-center') && layerId) {
            this.viewportEl.dispatchEvent(new CustomEvent('center-select', { detail: { layerId } }));
        }
    }

    /**
     * Replaces the current layers in the scene with new ones.
     * @param {HTMLElement[]} layerEls An array of detached layer DOM elements, ordered bottom to top.
     */
    setLayers(layerEls) {
        this.stackEl.innerHTML = ''; // Clear existing layers
        this.layerWraps = layerEls.map((layerEl, i) => {
            const wrap = document.createElement('div');
            wrap.className = 'layer-wrap';
            wrap.appendChild(layerEl);
            this.stackEl.appendChild(wrap);
            return wrap;
        });
        this._applyTransforms(); // Reapply transforms to new layers
    }

    /**
     * Sets the vertical spacing between layers.
     * @param {number} px Spacing in pixels.
     */
    setSpacing(px) {
        this.spacing = px;
        this._applyTransforms();
    }

    /**
     * Sets the opacity of all layers.
     * @param {number} fraction Opacity value from 0 to 1.
     */
    setOpacity(fraction) {
        this.layerWraps.forEach(wrap => {
            wrap.style.opacity = fraction;
        });
    }

    /**
     * Toggles the visibility of a specific layer.
     * @param {string} id The data-layer-id of the layer to toggle.
     * @param {boolean} visible True to show, false to hide.
     */
    setLayerVisible(id, visible) {
        const wrap = this.layerWraps.find(lw => lw.firstElementChild && lw.firstElementChild.dataset.layerId === id);
        if (wrap) {
            wrap.style.display = visible ? '' : 'none';
        }
    }

    /** Resets the view to its initial rotation and zoom. */
    resetView() {
        this.rotX = -60;
        this.rotZ = 45;
        this.zoom = 0.9;
        this._applyTransforms();
    }

    /**
     * Highlights a column of palaces across all layers and dispatches an event.
     * @param {number|null} branchIndex The branch index to highlight, or null to clear all highlights.
     * @param {string|null} layerId The layer the interaction happened on, if any.
     * @param {'hover'|'click'} source How the selection was made (drives arrow drawing).
     */
    highlight(branchIndex, layerId = null, source = 'hover') {
        const allPalaces = this.stackEl.querySelectorAll('.palace');
        allPalaces.forEach(palace => {
            if (palace.dataset.branchIndex === String(branchIndex)) {
                palace.classList.add('col-highlight');
            } else {
                palace.classList.remove('col-highlight');
            }
        });

        // Dispatch custom event for external modules (e.g., info panel)
        this.viewportEl.dispatchEvent(new CustomEvent('branch-select', {
            detail: { branchIndex, layerId, source },
        }));
    }

    /**
     * Clears any pinned branch.
     */
    clearPin() {
        this.pinnedBranchIndex = null;
        this.highlight(null, null, 'click');
    }

    /**
     * Returns the index of the currently pinned branch.
     * @returns {number|null}
     */
    getPinnedBranchIndex() {
        return this.pinnedBranchIndex;
    }
}
