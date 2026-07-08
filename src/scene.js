/**
 * Interaction controller for the flat 疊宮盤 viewport (the class keeps its historical
 * name from the 3D era; the cube view was removed 2026-07 in favor of the single
 * flat chart). Owns palace hover/pin state and dispatches:
 *   - 'branch-select' { branchIndex, layerId, source: 'hover'|'click' }
 *   - 'center-select' { layerId }
 * Without drag-to-rotate there is no pointer capture, so plain click events are safe.
 */
export class Scene {
    /**
     * @param {HTMLElement} viewportEl The DOM element containing the chart.
     */
    constructor(viewportEl) {
        this.viewportEl = viewportEl;
        this.pinnedBranchIndex = null; // null or the index of the currently pinned branch

        this.viewportEl.addEventListener('click', this._onClick.bind(this));
        this.viewportEl.addEventListener('pointerover', this._onPointerOver.bind(this));
        this.viewportEl.addEventListener('pointerout', this._onPointerOut.bind(this));
    }

    /**
     * Handles clicks for pinning/unpinning a palace or selecting the chart center.
     * @param {MouseEvent} e
     */
    _onClick(e) {
        if (e.target.closest('button, input, select, a')) return; // real controls keep their clicks
        const layerId = e.target.closest('.layer')?.dataset.layerId ?? null;
        const palaceEl = e.target.closest('.palace');
        if (palaceEl) {
            const branchIndex = parseInt(palaceEl.dataset.branchIndex, 10);
            if (this.pinnedBranchIndex === branchIndex) {
                // Clicking the same index unpins it
                this.pinnedBranchIndex = null;
                this.highlight(null, null, 'click');
            } else {
                this.pinnedBranchIndex = branchIndex;
                this.highlight(branchIndex, layerId, 'click');
            }
            return;
        }
        // Click on the center area: let listeners draw the 生年四化
        if (e.target.closest('.layer-center') && layerId) {
            this.viewportEl.dispatchEvent(new CustomEvent('center-select', { detail: { layerId } }));
        }
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

        if (e.target.closest('.palace') && !e.relatedTarget?.closest('.palace')) {
            this.highlight(null, null, 'hover');
        }
    }

    /**
     * Highlights a palace and dispatches an event.
     * @param {number|null} branchIndex The branch index to highlight, or null to clear.
     * @param {string|null} layerId The layer the interaction happened on, if any.
     * @param {'hover'|'click'} source How the selection was made (drives arrow drawing).
     */
    highlight(branchIndex, layerId = null, source = 'hover') {
        const allPalaces = this.viewportEl.querySelectorAll('.palace');
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
