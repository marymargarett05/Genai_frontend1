import React, { useEffect, useState } from "react";
import Heatmap from "./components/MapView.jsx";

export default function HeatmapPage() {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/heatmap")
      .then(res => res.json())
      .then(setPoints);
  }, []);

  return (
    <div className="flex flex-col items-center mt-8">
      <h2 className="text-xl font-bold mb-4">Accident Risk Heatmap</h2>
      <Heatmap points={points} />
    </div>
  );
}