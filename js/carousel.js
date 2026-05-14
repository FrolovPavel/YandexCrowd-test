/**
 * @typedef {Object} CarouselOptions
 * @property {string} track - CSS selector for the sliding track element
 * @property {string} slide - CSS selector for individual slide elements
 * @property {string} [prevBtn] - CSS selector for the "previous" button
 * @property {string} [nextBtn] - CSS selector for the "next" button
 * @property {string} [dots] - CSS selector for dot indicator elements
 * @property {string} [activeDotClass] - CSS class applied to the active dot
 * @property {{ current: string, total: string }} [counter] - Selectors for counter display
 * @property {boolean} [infinite=false] - Enable infinite loop via DOM cloning
 * @property {number} [autoPlay=0] - Auto-advance interval in ms (0 = disabled)
 * @property {string} [breakpoint] - Media query — transform is only applied when it matches
 */

export class Carousel {
    /** @param {CarouselOptions} options */
    constructor(options) {
        this._opts = options;

        this._trackEl = document.querySelector(options.track);
        if (!this._trackEl) return;

        this._slides = [...this._trackEl.querySelectorAll(options.slide)];
        this._total = this._slides.length;
        this._prevBtn = options.prevBtn ? document.querySelector(options.prevBtn) : null;
        this._nextBtn = options.nextBtn ? document.querySelector(options.nextBtn) : null;
        this._dots = options.dots ? [...document.querySelectorAll(options.dots)] : [];
        this._counterEl = options.counter ? {
            current: document.querySelector(options.counter.current),
            total: document.querySelector(options.counter.total),
        } : null;

        this._current = 0;
        this._absoluteIndex = 0;
        this._isAnimating = false;
        this._autoTimer = null;
        this._mq = options.breakpoint ? window.matchMedia(options.breakpoint) : null;

        if (options.infinite) {
            this._setupClones();
            this._absoluteIndex = this._total; // start positioned at real slide 0
        }

        this._bindEvents();

        if (options.infinite) {
            this._applyTransform(false);
            this._updateCounter();
        } else {
            this._goTo(0);
        }

        if (options.autoPlay > 0) {
            this._startAuto();
        }
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    next() {
        if (this._opts.infinite) {
            this._nextInfinite();
        } else {
            if (this._current < this._total - 1) this._goTo(this._current + 1);
        }
    }

    prev() {
        if (this._opts.infinite) {
            this._prevInfinite();
        } else {
            if (this._current > 0) this._goTo(this._current - 1);
        }
    }

    // ─── Infinite mode ────────────────────────────────────────────────────────

    /**
     * Clones all slides, prepending and appending them to create a seamless loop.
     * Layout: [clones_start … real_slides … clones_end]
     */
    _setupClones() {
        const { _slides: realSlides, _trackEl: track } = this;

        realSlides.forEach(slide => {
            const clone = slide.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            track.appendChild(clone);
        });

        [...realSlides].reverse().forEach(slide => {
            const clone = slide.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            track.insertBefore(clone, track.firstChild);
        });
    }

    _nextInfinite() {
        if (this._isAnimating) return;
        this._isAnimating = true;
        this._absoluteIndex++;
        this._current = (this._current + 1) % this._total;
        this._applyTransform(true);
        this._updateCounter();
    }

    _prevInfinite() {
        if (this._isAnimating) return;
        this._isAnimating = true;
        this._absoluteIndex--;
        this._current = (this._current - 1 + this._total) % this._total;
        this._applyTransform(true);
        this._updateCounter();
    }

    /** @param {boolean} animate */
    _applyTransform(animate) {
        this._trackEl.style.transition = animate ? 'transform 0.4s ease' : 'none';
        if (!animate) void this._trackEl.offsetWidth; // force reflow before instant snap
        this._trackEl.style.transform = `translateX(-${this._absoluteIndex * this._getItemWidth()}px)`;
    }

    _getItemWidth() {
        const { children } = this._trackEl;
        if (children.length < 2) return children[0].offsetWidth;
        return children[1].offsetLeft - children[0].offsetLeft;
    }

    // ─── Linear mode ──────────────────────────────────────────────────────────

    /** @param {number} index */
    _goTo(index) {
        this._current = index;
        this._trackEl.style.transform = `translateX(-${this._current * this._getSlideWidth()}px)`;

        this._dots.forEach((dot, i) => {
            const isActive = i === this._current;
            dot.classList.toggle(this._opts.activeDotClass, isActive);
            dot.setAttribute('aria-selected', String(isActive));
        });

        if (this._prevBtn) this._prevBtn.disabled = this._current === 0;
        if (this._nextBtn) this._nextBtn.disabled = this._current === this._total - 1;

        this._updateCounter();
    }

    _getSlideWidth() {
        if (this._slides.length < 2) return this._slides[0].offsetWidth;
        return this._slides[1].offsetLeft - this._slides[0].offsetLeft;
    }

    // ─── Counter ──────────────────────────────────────────────────────────────

    _updateCounter() {
        if (!this._counterEl) return;
        if (this._counterEl.current) this._counterEl.current.textContent = this._current + 1;
        if (this._counterEl.total) this._counterEl.total.textContent = this._total;
    }

    // ─── Auto-play ────────────────────────────────────────────────────────────

    _startAuto() {
        this._stopAuto();
        this._autoTimer = setInterval(() => this.next(), this._opts.autoPlay);
    }

    _stopAuto() {
        if (this._autoTimer) {
            clearInterval(this._autoTimer);
            this._autoTimer = null;
        }
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    _bindEvents() {
        this._prevBtn?.addEventListener('click', () => {
            this.prev();
            if (this._opts.autoPlay > 0) this._startAuto();
        });

        this._nextBtn?.addEventListener('click', () => {
            this.next();
            if (this._opts.autoPlay > 0) this._startAuto();
        });

        this._dots.forEach((dot, i) => {
            dot.addEventListener('click', () => this._goTo(i));
        });

        if (this._opts.infinite) {
            this._bindInfiniteEvents();
        }

        if (this._mq) {
            this._bindBreakpointEvents();
        }
    }

    _bindInfiniteEvents() {
        // After animating into the clone zone — silently snap back to the real zone
        this._trackEl.addEventListener('transitionend', () => {
            this._isAnimating = false;

            if (this._absoluteIndex >= this._total * 2) {
                this._absoluteIndex -= this._total;
                this._applyTransform(false);
            } else if (this._absoluteIndex < this._total) {
                this._absoluteIndex += this._total;
                this._applyTransform(false);
            }
        });

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            this._isAnimating = false;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this._applyTransform(false), 100);
        });
    }

    _bindBreakpointEvents() {
        this._mq.addEventListener('change', (e) => {
            this._trackEl.style.transform = e.matches
                ? `translateX(-${this._current * this._getSlideWidth()}px)`
                : '';
        });

        window.addEventListener('resize', () => {
            if (this._mq.matches) {
                this._trackEl.style.transform = `translateX(-${this._current * this._getSlideWidth()}px)`;
            }
        });
    }
}
