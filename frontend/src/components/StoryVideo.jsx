import React, { forwardRef, useState } from 'react';

const VIDEO_SRC = '/assets/video/our-story.mp4';

// Renders the project's story video, falling back to a still poster when the
// MP4 isn't reachable. The MP4 is git-ignored (>100 MB), so this keeps the page
// from showing a broken <video> in deployed builds while still working in dev.
const StoryVideo = forwardRef(function StoryVideo(
  { poster, className, style, fallbackClassName, fallbackAriaLabel, children, ...videoProps },
  ref
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
