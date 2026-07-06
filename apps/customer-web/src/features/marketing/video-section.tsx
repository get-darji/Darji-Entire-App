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
        scale: 0.82,
        borderRadius: 34,
        boxShadow: "0 34px 110px rgba(0,0,0,0.26)",
        force3D: true,
        transformOrigin: "50% 50%"
      });

      gsap.set(video, {
        scale: 1.08,
        force3D: true,
        transformOrigin: "50% 50%"
      });

      gsap.set(stage, {
        backgroundColor: "#f7f7f3"
      });

      const playVideo = () => {
        video.play().catch(() => undefined);
      };

      const pauseVideo = () => {
        video.pause();
      };

      const expandTimeline = gsap.timeline({
        paused: true,
        defaults: {
          duration: 1.08,
          ease: "power3.inOut"
        }
      });

      expandTimeline
        .to(stage, {
          backgroundColor: "#040404"
        }, 0)
        .to(frame, {
          scale: 1.12,
          borderRadius: 0,
          boxShadow: "0 0 0 rgba(0,0,0,0)"
        }, 0)
        .to(video, {
          scale: 1
        }, 0);

      ScrollTrigger.create({
        trigger: section,
        start: "top 72%",
        end: "bottom 35%",
        invalidateOnRefresh: true,
        onEnter: () => {
          playVideo();
          expandTimeline.play();
        },
        onEnterBack: () => {
          playVideo();
          expandTimeline.play();
        },
        onLeave: playVideo,
        onLeaveBack: () => {
          expandTimeline.reverse();
          pauseVideo();
        }
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
      <div ref={stageRef} className="grid min-h-screen w-full place-items-center overflow-hidden bg-[#f7f7f3] px-3 py-4 sm:px-6 sm:py-6">
        <div
          ref={frameRef}
          className="relative aspect-video w-[min(92vw,1440px)] overflow-hidden rounded-[34px] bg-[#090909] shadow-[0_34px_110px_rgba(0,0,0,0.26)] will-change-transform"
          style={{
            transform: "translate3d(0, 0, 0) scale(0.82)",
            backfaceVisibility: "hidden"
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/45 via-black/10 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-black/55 via-black/12 to-transparent" />
          <video ref={videoRef} className="h-full w-full object-cover will-change-transform" src="/video.mp4" muted={isMuted} playsInline preload="auto" loop />

          <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/88 backdrop-blur-md sm:left-6 sm:top-6">
            Doorstep tailoring in motion
          </div>

          <button
            type="button"
            onClick={toggleVolume}
            aria-label={isMuted ? "Turn video sound on" : "Mute video sound"}
            className="absolute bottom-5 right-5 z-20 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/55 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition duration-200 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/80"
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
