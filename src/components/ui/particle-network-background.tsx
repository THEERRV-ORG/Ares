"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Mouse {
  x: number | null;
  y: number | null;
  radius: number;
}

class Particle {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
  color: string;

  constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string) {
    this.x = x;
    this.y = y;
    this.directionX = directionX;
    this.directionY = directionY;
    this.size = size;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  update(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, mouse: Mouse) {
    if (this.x > canvas.width || this.x < 0) {
      this.directionX = -this.directionX;
    }
    if (this.y > canvas.height || this.y < 0) {
      this.directionY = -this.directionY;
    }

    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < mouse.radius + this.size) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (mouse.radius - distance) / mouse.radius;
        this.x -= forceDirectionX * force * 5;
        this.y -= forceDirectionY * force * 5;
      }
    }

    this.x += this.directionX;
    this.y += this.directionY;
    this.draw(ctx);
  }
}

interface ParticleNetworkBackgroundProps {
  className?: string;
  particleColor?: string;
  lineColor?: string;
  hoverLineColor?: string;
}

export function ParticleNetworkBackground({
  className,
  particleColor = "rgba(191, 128, 255, 0.8)",
  lineColor = "rgba(200, 150, 255, ",
  hoverLineColor = "rgba(255, 255, 255, ",
}: ParticleNetworkBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse: Mouse = { x: null, y: null, radius: 150 };

    function init() {
      if (!canvas) return;
      particles = [];
      const numberOfParticles = (canvas.height * canvas.width) / 9000;
      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 2 + 1;
        const x = Math.random() * (canvas.width - size * 2) + size;
        const y = Math.random() * (canvas.height - size * 2) + size;
        const directionX = Math.random() * 0.4 - 0.2;
        const directionY = Math.random() * 0.4 - 0.2;
        particles.push(new Particle(x, y, directionX, directionY, size, particleColor));
      }
    }

    const resizeCanvas = () => {
      if (!canvas || !parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      init();
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(parent);
    resizeCanvas();

    const connect = () => {
      if (!canvas) return;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const distance =
            (particles[a].x - particles[b].x) * (particles[a].x - particles[b].x) +
            (particles[a].y - particles[b].y) * (particles[a].y - particles[b].y);

          if (distance < (canvas.width / 7) * (canvas.height / 7)) {
            const opacityValue = 1 - distance / 20000;

            const dxMouseA = particles[a].x - (mouse.x ?? 0);
            const dyMouseA = particles[a].y - (mouse.y ?? 0);
            const distanceMouseA = Math.sqrt(dxMouseA * dxMouseA + dyMouseA * dyMouseA);

            ctx.strokeStyle =
              mouse.x !== null && distanceMouseA < mouse.radius
                ? `${hoverLineColor}${opacityValue})`
                : `${lineColor}${opacityValue})`;

            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const particle of particles) {
        particle.update(ctx, canvas, mouse);
      }
      connect();
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseout", handleMouseOut);

    animate();

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleColor, lineColor, hoverLineColor]);

  return <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full", className)} />;
}
