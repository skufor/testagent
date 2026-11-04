import React from 'react';
import Lottie from 'lottie-react';
import cuteDoggie from '../assets/cute-doggie.json';

export default function CuteDoggieLottie({ className }) {
  return (
    <Lottie
      animationData={cuteDoggie}
      loop
      autoplay
      className={className}
      aria-hidden="true"
    />
  );
}
