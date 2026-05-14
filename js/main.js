import { Carousel } from './carousel.js';

new Carousel({
    track: '.stages__track',
    slide: '.stages__slide',
    prevBtn: '.stages__arrow-prev',
    nextBtn: '.stages__arrow-next',
    dots: '.stages__dot',
    activeDotClass: 'stages__dot-active',
    infinite: false,
    breakpoint: '(max-width: 1199px)',
});

new Carousel({
    track: '.participants__track',
    slide: '.participants__card',
    prevBtn: '.participants__arrow-prev',
    nextBtn: '.participants__arrow-next',
    counter: {
        current: '.participants__current',
        total: '.participants__total',
    },
    infinite: true,
    // autoPlay: 4000,
});
