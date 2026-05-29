import { forwardRef, useState, type VideoHTMLAttributes } from 'react';

const VIDEO_SRC = '/assets/video/our-story.mp4';

type StoryVideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  fallbackClassName?: string;
  fallbackAriaLabel?: string;
};

const StoryVideo = forwardRef<HTMLVideoElement, StoryVideoProps>(function StoryVideo(
  { poster, className, style, fallbackClassName, fallbackAriaLabel, children, ...videoProps },
  ref,
) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={fallbackClassName || className}
        role="img"
        aria-label={fallbackAriaLabel || 'Video poster'}
        style={{
          ...style,
          backgroundImage: poster ? `url(${poster})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#0B0F1A',
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      poster={poster}
      onError={() => setFailed(true)}
      {...videoProps}
    >
      <source src={VIDEO_SRC} type="video/mp4" />
    </video>
  );
});

export default StoryVideo;
