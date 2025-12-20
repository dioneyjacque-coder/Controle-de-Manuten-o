
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

    const width = 1000;
    const height = 700;
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    // Projeção focada no coração da Amazônia ocidental
    const projection = d3.geoMercator()
      .center([-66.5, -4.0]) 
      .scale(5500) 
      .translate([width / 2, height / 2]);

    const colorScale = d3.scaleOrdinal()
      .domain([Region.SOLIMOES, Region.JAPURA, Region.JURUA])
      .range(['#fb923c', '#34d399', '#fbbf24']);

    // Fundo Satelital Estilizado (Verde Floresta Profundo)
    const defs = svg.append('defs');
    const forestGradient = defs.append('radialGradient')
      .attr('id', 'forest-bg')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    forestGradient.append('stop').attr('offset', '0%').attr('stop-color', '#064e3b');
    forestGradient.append('stop').attr('offset', '100%').attr('stop-color', '#022c22');

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#forest-bg)')
      .attr('rx', 32);

    // Camada de Rios (Caminhos estilizados que representam as calhas)
    const riverData = [
      { name: 'Solimões', points: [[-70, -4.4], [-68, -4.0], [-66, -3.8], [-63, -3.9]] },
      { name: 'Japurá', points: [[-70, -1.5], [-68, -1.8], [-66, -2.0], [-65, -2.5]] },
      { name: 'Juruá', points: [[-70, -7.0], [-68, -6.5], [-67, -5.5], [-66, -4.5]] }
    ];

    const lineGenerator = d3.line()
      .x((d: any) => projection([d[0], d[1]])![0])
      .y((d: any) => projection([d[0], d[1]])![1])
      .curve(d3.curveBasis);

    svg.selectAll('.river')
      .data(riverData)
      .join('path')
      .attr('class', 'river')
      .attr('d', (d: any) => lineGenerator(d.points))
      .attr('fill', 'none')
      .attr('stroke', '#0ea5e9')
      .attr('stroke-width', 8)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.4)
      .attr('filter', 'blur(2px)');

    // Municípios
    const points = svg.selectAll('.muni-point')
      .data(AMAZONAS_MUNICIPALITIES)
      .join('g')
      .attr('class', 'muni-point')
      .style('cursor', 'pointer')
      .on('click', (event, d) => onSelectMunicipality(d.id));

    points.each(function(d) {
      const [x, y] = projection([d.lng, d.lat]) || [0, 0];
      const g = d3.select(this);
      const isSelected = d.id === selectedMunId;

      // Glow effect
      if (isSelected) {
        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 25)
          .attr('fill', colorScale(d.region) as string)
          .attr('opacity', 0.3)
          .append('animate')
          .attr('attributeName', 'opacity')
          .attr('values', '0.3;0.1;0.3')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');
      }

      // Base Circle
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', isSelected ? 12 : 8)
        .attr('fill', '#fff')
        .attr('stroke', colorScale(d.region) as string)
        .attr('stroke-width', isSelected ? 4 : 2)
        .attr('class', 'transition-all duration-300');

      // Inner Dot
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', isSelected ? 6 : 4)
        .attr('fill', colorScale(d.region) as string);

      // Label
      const label = g.append('text')
        .attr('x', x)
        .attr('y', y - 20)
        .attr('text-anchor', 'middle')
        .style('font-size', isSelected ? '14px' : '11px')
        .style('font-weight', '900')
        .style('fill', isSelected ? '#fff' : '#94a3b8')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.05em')
        .style('pointer-events', 'none')
        .text(d.name);

      if (isSelected) {
        label.style('text-shadow', '0 0 10px rgba(0,0,0,0.8)');
      }
    });

    // Legenda Flutuante (Glassmorphism)
    const legend = svg.append('g').attr('transform', 'translate(40, 40)');
    
    legend.append('rect')
      .attr('width', 220)
      .attr('height', 130)
      .attr('rx', 20)
      .attr('fill', 'rgba(255,255,255,0.05)')
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('backdrop-filter', 'blur(10px)');

    const regions = [
      { id: Region.SOLIMOES, label: 'Rio Solimões' },
      { id: Region.JAPURA, label: 'Rio Japurá' },
      { id: Region.JURUA, label: 'Rio Juruá' }
    ];

    regions.forEach((r, i) => {
      const g = legend.append('g').attr('transform', `translate(20, ${30 + i * 35})`);
      g.append('circle').attr('r', 6).attr('fill', colorScale(r.id) as string);
      g.append('text')
        .attr('x', 20)
        .attr('y', 5)
        .style('fill', '#cbd5e1')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(r.label);
    });

  }, [onSelectMunicipality, selectedMunId]);

  return (
    <div className="w-full bg-slate-950 rounded-[3rem] shadow-2xl p-2 border-8 border-slate-900 overflow-hidden relative group">
      <div className="absolute top-10 right-10 z-10 space-y-3 pointer-events-none">
          <div className="bg-emerald-500/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-emerald-500/20 flex items-center space-x-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Visão Operacional</span>
          </div>
      </div>
      
      <div className="relative">
        <svg ref={svgRef} className="w-full h-auto min-h-[600px] cursor-crosshair"></svg>
      </div>

      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-center">
        <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex items-center space-x-6">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Coordenadas Ativas</span>
              <span className="text-xs font-bold text-white">Bacia Amazônica (AM)</span>
           </div>
           <div className="h-8 w-[1px] bg-white/10"></div>
           <div className="flex items-center space-x-3">
              <i className="fas fa-satellite text-orange-500"></i>
              <span className="text-[10px] font-bold text-slate-300">Dados Geo-referenciados</span>
           </div>
        </div>
        
        {selectedMunId && (
          <button 
            onClick={() => onSelectMunicipality('')}
            className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-orange-500 transition-all active:scale-95 flex items-center"
          >
            <i className="fas fa-compress-arrows-alt mr-3"></i>
            Resetar Visão
          </button>
        )}
      </div>
    </div>
  );
};

export default InteractiveMap;
