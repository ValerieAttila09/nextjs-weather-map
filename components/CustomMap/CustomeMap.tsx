"use client";

import { Nullable, WeatherData } from "@/lib/types/interfaces";
import React, { useEffect, useRef, useState } from "react";

export default function CustomMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(3);
  const [center] = useState<{ lat: number; lon: number }>({
    lat: -6.2,
    lon: 106.8,
  });
  const [weather, setWeather] = useState<Nullable<WeatherData>>(null);
  const TILE_SIZE = 256;

  const fetchWeather = async (lat: number, lon: number): Promise<void> => {
    try {
      const key = process.env.NEXT_PUBLIC_WEATHER_KEY;
      if (!key) return;
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`
      );
      if (!res.ok) return;
      const data = (await res.json()) as WeatherData;
      setWeather(data);
    } catch (err) {
      setWeather(null);
      throw new Error(`Error accoured : ${err}`);
    }
  };

  const lonToTile = (lon: number, z: number): number => ((lon + 180) / 360) * Math.pow(2, z);
  const latToTile = (lat: number, z: number): number => {
    const rad = (lat * Math.PI) / 180;
    const n = Math.log(Math.tan(rad) + 1 / Math.cos(rad));
    return ((1 - n / Math.PI) / 2) * Math.pow(2, z);
  };

  const tileToLon = (x: number, z: number): number => (x / Math.pow(2, z)) * 360 - 180;
  const tileToLat = (y: number, z: number): number => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  const renderMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = Math.round(window.innerHeight * 0.8);

    const centerTileX = lonToTile(center.lon, zoom);
    const centerTileY = latToTile(center.lat, zoom);
    const tilesX = Math.ceil(canvas.width / TILE_SIZE) + 2;
    const tilesY = Math.ceil(canvas.height / TILE_SIZE) + 2;
    const startX = Math.floor(centerTileX - Math.floor(tilesX / 2));
    const startY = Math.floor(centerTileY - Math.floor(tilesY / 2));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const n = Math.pow(2, zoom);

    for (let xi = startX; xi < startX + tilesX; xi++) {
      for (let yi = startY; yi < startY + tilesY; yi++) {
        const wrappedX = ((xi % n) + n) % n;
        const clampedY = Math.max(0, Math.min(yi, n - 1));

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`;

        const drawX = (xi - centerTileX) * TILE_SIZE + canvas.width / 2;
        const drawY = (yi - centerTileY) * TILE_SIZE + canvas.height / 2;

        img.onload = () => {
          try {
            ctx.drawImage(img, drawX, drawY, TILE_SIZE, TILE_SIZE);
          } catch (e) {
            throw new Error(`Error accoured : ${e}`);
          }
        };
      }
    }
  };

  useEffect(() => {
    renderMap();

    const onResize = () => renderMap();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [center, zoom]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((z) => Math.min(19, Math.max(1, z + (e.deltaY > 0 ? -1 : 1))));
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - canvas.height / 2;

    const tileX = lonToTile(center.lon, zoom) + x / TILE_SIZE;
    const tileY = latToTile(center.lat, zoom) + y / TILE_SIZE;

    const lon = tileToLon(tileX, zoom);
    const lat = tileToLat(tileY, zoom);

    fetchWeather(lat, lon);
  };

  return (
    <>
      <div className="w-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onClick={handleClick}
          className="w-4/5 h-[calc(80vh-20%)] bg-neutral-100"
          style={{ cursor: "pointer" }}
        />
      </div>

      {weather && (
        <div className="p-4 bg-white shadow mt-2 rounded">
          <h3 className="font-bold text-2xl text-neutral-800">{weather.name}</h3>
          <p>Temp: {weather.main.temp} °C</p>
          <p>Weather: {weather.weather[0]?.description ?? "-"}</p>
          <p>Humidity: {weather.main.humidity}%</p>
        </div>
      )}
    </>
  );
}