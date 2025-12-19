
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AMAZONAS_MUNICIPALITIES } from '../constants';
import { Region } from '../types';

interface MapProps {
  onSelectMunicipality: (id: string) => void;
  selectedMunId: string | null;
}

const InteractiveMap: React.FC<MapProps> = ({ onSelectMunicipality, selectedMunId }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Increased dimensions for better visibility
    const width = 1000;
    const height = 700;
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    // Adjusted projection for better focus on Solimões, Japurá, and Juruá basins
    const projection = d3.geoMercator()
      .center([-66.5, -4.2]) 
      .scale(4500) // Increased scale to make the map "larger"
      .translate([width / 2, height / 2]);

    const colorScale = d3.scaleOrdinal()
      .domain([Region.SOLIMOES, Region.JAPURA, Region.JURUA])
      .range(['#f97316', '#10b981', '#f59e0b']); // Orange, Emerald, Amber

    // Background container
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#f1f5f9') // Slate 100
      .attr('rx', 24);

    // Draw grid lines (subtle)
    const graticule = d3.geoGraticule().step([1, 1]);
    svg.append('path')
      .datum(graticule)
      .attr('d', d3.geoPath().projection(projection) as any)
      .attr('fill', 'none')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 0.8)
      .attr('stroke-dasharray', '2,2');

    // Municipality points and labels
    const points = svg.selectAll('.muni-point')
      .data(AMAZONAS_MUNICIPALITIES)
      .join('g')
      .attr('class', 'muni-point')
      .style('cursor', 'pointer')
      .on('click', (event, d) => onSelectMunicipality(d.id));

    points.each(function(d) {
      const [x, y] = projection([d.lng, d.lat]) || [0, 0];
      const g = d3.select(this);

      // Pulse effect for selected municipality
      if (d.id === selectedMunId) {
        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 20)
          .attr('fill', colorScale(d.region) as string)
          .attr('opacity', 0.2)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '20;30;20')
          .attr('dur', '1.5s')
          .attr('repeatCount', 'indefinite');
      }

      // Outer ring for better visibility
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', d.id === selectedMunId ? 14 : 10)
        .attr('fill', 'white')
        .attr('stroke', colorScale(d.region) as string)
        .attr('stroke-width', 3)
        .attr('class', 'transition-all duration-300');

      // Inner dot
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', d.id === selectedMunId ? 8 : 5)
        .attr('fill', colorScale(d.region) as string);

      // Improved text labeling
      const label = g.append('text')
        .attr('x', x)
        .attr('y', y + 25) // Position below the dot
        .attr('text-anchor', 'middle')
        .style('font-size', d.id === selectedMunId ? '14px' : '12px')
        .style('font-weight', d.id === selectedMunId ? '800' : '600')
        .style('fill', d.id === selectedMunId ? '#1e293b' : '#475569')
        .style('pointer-events', 'none')
        .text(d.name);

      // White background for text to make it readable over lines
      const bbox = (label.node() as SVGTextElement).getBBox();
      g.insert('rect', 'text')
        .attr('x', bbox.x - 4)
        .attr('y', bbox.y - 2)
        .attr('width', bbox.width + 8)
        .attr('height', bbox.height + 4)
        .attr('fill', 'white')
        .attr('opacity', 0.7)
        .attr('rx', 4);
    });

    // Enhanced Legend
    const legend = svg.append('g').attr('transform', 'translate(30, 40)');
    const regions = [Region.SOLIMOES, Region.JAPURA, Region.JURUA];
    
    legend.append('text')
      .attr('y', -15)
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#1e293b')
      .text('Bacias Hidrográficas');

    regions.forEach((region, i) => {
      const g = legend.append('g').attr('transform', `translate(0, ${i * 30})`);
      g.append('rect')
        .attr('width', 20)
        .attr('height', 20)
        .attr('rx', 6)
        .attr('fill', colorScale(region) as string);
      
      g.append('text')
        .attr('x', 30)
        .attr('y', 15)
        .style('font-size', '13px')
        .style('font-weight', '700')
        .style('fill', '#334155')
        .text(region);
    });

  }, [onSelectMunicipality, selectedMunId]);

  return (
    <div className="w-full bg-white rounded-3xl shadow-2xl p-4 md:p-8 border border-slate-200 overflow-hidden transition-all">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 flex items-center">
            <i className="fas fa-map-marked-alt mr-3 text-orange-600"></i>
            Mapa de Operações Técnicas
          </h3>
          <p className="text-sm text-slate-500 font-medium">Calhas dos Rios Amazonas</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
           <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navegação Interativa</div>
        </div>
      </div>
      <div className="relative border-4 border-slate-50 rounded-2xl overflow-hidden bg-slate-50">
        <svg ref={svgRef} className="w-full h-auto min-h-[500px] md:min-h-[650px] cursor-grab active:cursor-grabbing"></svg>
        
        {/* Floating controls hint */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur shadow-lg p-3 rounded-2xl border border-slate-200 flex items-center space-x-3">
               <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
               <span className="text-xs font-bold text-slate-700">Sistema GPS Ativo</span>
            </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="flex items-center p-3 bg-orange-50 rounded-2xl border border-orange-100">
          <i className="fas fa-mouse-pointer text-orange-500 mr-3"></i>
          <span className="text-xs text-orange-700 font-bold">Clique no município para filtrar</span>
        </div>
        <div className="flex items-center p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
          <i className="fas fa-search-plus text-emerald-500 mr-3"></i>
          <span className="text-xs text-emerald-700 font-bold">Visão ampliada das calhas</span>
        </div>
        <div className="flex items-center p-3 bg-amber-50 rounded-2xl border border-amber-100">
          <i className="fas fa-sync-alt text-amber-500 mr-3"></i>
          <span className="text-xs text-amber-700 font-bold">Atualização em tempo real</span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;
