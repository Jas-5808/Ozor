import React, { useState, useEffect } from 'react';
import cn from './SimpleSlider.module.scss';

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d33ptvl2llnd6jumh5lg/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '2',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34iind2llnd6jumo8kg/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '3',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d30hgn7iub35i07kcma0/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '4',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d1h3q78s9rffrfkvbhk0/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '5',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34jpk7iub35i07lfu50/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '6',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d2tdblj4eu2hs07rovpg/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '7',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34ehtb4eu2up0aukimg/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '8',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34el1fiub35i07ldid0/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '9',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34kv5viub35i07lght0/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '10',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34f19t2llnd6jummkfg/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '11',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34i4qr4eu2up0aum370/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '12',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d28amrt2lln1rmfjdk8g/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '13',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34j3kfiub35i07lfih0/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '14',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34khnfiub35i07lgbd0/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '15',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d2vqva52llnd6julfnmg/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '16',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d0cs0m0jsv1iusmhoq30/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '17',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34k38r4eu2up0aun5f0/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '18',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34kc4t2llnd6jump73g/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '19',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d2mq5hl2llnd6juj88b0/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '20',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d1id8sniub335orlvp1g/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '21',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d2864352lln1rmfjb1gg/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '22',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34f6152llnd6jummm5g/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '23',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d2vq7at2llnd6julfjcg/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '24',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d34i36b4eu2up0aum240/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '25',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d2vr0sl2llnd6julfo1g/main_page_banner.jpg',
    link: '#'
  },
  {
    id: '26',
    title: '',
    subtitle: '',
    image: 'https://images.uzum.uz/d18fmsq7s4fup34aaj40/main_page_banner.jpg',
    link: '#'
  }
];

export const SimpleSlider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000); // Автопрокрутка каждые 4 секунды

    return () => clearInterval(interval);
  }, []);

  // Отслеживание загрузки изображений
  useEffect(() => {
    const imagePromises = slides.map((slide) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          setLoadingImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(slide.id);
            return newSet;
          });
          resolve();
        };
        img.onerror = () => {
          setLoadingImages(prev => {
            const newSet = new Set(prev);
            newSet.delete(slide.id);
            return newSet;
          });
          resolve();
        };
        img.src = slide.image;
      });
    });

    // Инициализируем состояние загрузки
    setLoadingImages(new Set(slides.map(slide => slide.id)));

    Promise.all(imagePromises).then(() => {
      setAllImagesLoaded(true);
    });
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className={cn.slider}>
      <div className={cn.sliderContainer}>
        {/* Индикатор загрузки */}
        {!allImagesLoaded && (
          <div className={cn.loadingOverlay}>
            <div className={cn.loadingSpinner}></div>
            <p className={cn.loadingText}>Загрузка изображений...</p>
          </div>
        )}

        <div 
          className={cn.slidesWrapper}
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className={cn.slide}>
              <a 
                href={slide.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className={cn.slideLink}
              >
                <img 
                  src={slide.image} 
                  alt="Баннер" 
                  className={cn.slideImage}
                  style={{ 
                    opacity: loadingImages.has(slide.id) ? 0.3 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                />
                {loadingImages.has(slide.id) && (
                  <div className={cn.imageLoading}>
                    <div className={cn.imageSpinner}></div>
                  </div>
                )}
              </a>
            </div>
          ))}
        </div>

        {/* Индикаторы */}
        <div className={cn.indicators}>
          {slides.map((_, index) => (
            <button
              key={index}
              className={`${cn.indicator} ${index === currentSlide ? cn.active : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Перейти к слайду ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleSlider;
