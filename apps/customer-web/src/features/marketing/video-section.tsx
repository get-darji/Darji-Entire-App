"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

export function VideoSection() {
  const [isMuted, setIsMuted] = useState(true);
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    const video = videoRef.current;

    if (!section || !stage || !frame || !video) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(frame, {
        scale: 0.78,
        yPercent: 0,
        borderRadius: 32,
        force3D: true,
        transformOrigin: "50% 50%"
      });

      gsap.set(video, {
        scale: 1.01,
        force3D: true,
        transformOrigin: "50% 50%"
      });

      const playVideo = () => {
        video.play().catch(() => undefined);
      };

      const pauseVideo = () => {
        video.pause();
      };

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=300%",
          pin: stage,
          pinSpacing: true,
          scrub: true,
          anticipatePin: 1,
          refreshPriority: -1,
          invalidateOnRefresh: true,
          onEnter: playVideo,
          onEnterBack: playVideo,
          onLeave: pauseVideo,
          onLeaveBack: pauseVideo
        }
      });

      timeline
        .to(frame, {
          scale: 1.18,
          borderRadius: 0,
          duration: 0.4
        })
        .to(frame, {
          scale: 1.18,
          yPercent: 0,
          borderRadius: 0,
          duration: 0.2
        })
        .to(frame, {
          scale: 0.88,
          yPercent: 0,
          borderRadius: 24,
          duration: 0.4
        });

      const refresh = () => ScrollTrigger.refresh();
      const refreshId = window.setTimeout(refresh, 0);
      video.addEventListener("loadedmetadata", refresh, { once: true });

      return () => {
        window.clearTimeout(refreshId);
        video.removeEventListener("loadedmetadata", refresh);
      };
    }, section);

    return () => ctx.revert();
  }, []);

  const toggleVolume = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const shouldMute = !video.muted;
    video.muted = shouldMute;
    video.volume = shouldMute ? 0 : 1;

    if (!shouldMute) {
      video.play().catch(() => undefined);
    }

    setIsMuted(shouldMute);
  };

  return (
    <section ref={sectionRef} className="relative min-h-screen bg-[#f7f7f3]">
      <div ref={stageRef} className="grid h-screen w-full place-items-center overflow-hidden bg-[#f7f7f3] px-5 py-8 sm:px-10">
        <div
          ref={frameRef}
          className="relative aspect-video w-[min(86vw,1440px)] overflow-hidden rounded-[32px] bg-[#111111] shadow-[0_34px_110px_rgba(0,0,0,0.26)] will-change-transform"
          style={{
            transform: "translate3d(0, 0, 0) scale(0.78)",
            backfaceVisibility: "hidden"
          }}
        >
          <video ref={videoRef} className="h-full w-full object-cover will-change-transform" src="/video.mp4" muted={isMuted} playsInline preload="auto" loop />

          <button
            type="button"
            onClick={toggleVolume}
            aria-label={isMuted ? "Turn video sound on" : "Mute video sound"}
            className="absolute bottom-5 right-5 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/55 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition duration-200 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            {isMuted ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path d="m22 9-6 6" />
                <path d="m16 9 6 6" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M18.36 5.64a9 9 0 0 1 0 12.72" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
