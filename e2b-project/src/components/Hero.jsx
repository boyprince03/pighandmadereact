
import React from 'react';

const heroImages = [
  "https://cdn.cybassets.com/s/files/15409/ckeditor/pictures/content_611f924b-4eda-4f2f-b46e-bf6ce33b98c0.jpg",

];

const Hero = () => {
  return (
    <section className="bg-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {heroImages.map((src, index) => (
            <div key={index} className="w-full h-auto">
              <img src={src} alt={`Promotional banner \${index + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
