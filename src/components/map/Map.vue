<template>
  <div class="panel panel-default">
   <div class="panel-body" crossorigin="Anonymous" ref='map' id="map" style="height:100%;text-align: center;">
  </div>
  <!-- 工具栏 -->
  <Toolbar  class="Toolbar c"  :obj="obj.toolbar"/>
  <!-- 标绘工具-->
  <DrawTool  class="DrawTool c"  v-show='drawToolVisible'/>
  <!--搜索 -->
  <Search class='Search c' ref='search' :obj='obj.searchList' v-show='SearchVisible' />
  <!-- 指北针-->
  <Compass class='Compass c' :obj='obj.compass' v-show='CompassVisible'></Compass>
  <!-- 图例-->
  <Legend class='Legend c' :obj='obj.legend'v-show='LegendVisible' ></Legend>
  <!-- Popup-->
  <Popup ref='pop'/>
 
 
</div>
</template>

<script>

import data from '../../data/data.js'
import {mapState,mapMutations} from 'vuex'
import html2canvas from 'html2canvas';
import com from '../../common/common.js'
import Toolbar from '../common/Toolbar'
import bus from '../../../config/Event.js'
import 'ol/ol.css'
import {unByKey} from 'ol/Observable';
import {LineString, Polygon} from 'ol/geom';
import Overlay from 'ol/Overlay';
import {circular as circularPolygon} from 'ol/geom/Polygon';
import {defaults as defaultControls, ZoomToExtent,ZoomSlider,Zoom, FullScreen,LayerSwitcher,PanZoomBar,Permalink,ScaleLine,MousePosition,OverviewMap,KeyboardDefaults} from 'ol/control';
import Draw from 'ol/interaction/Draw';
import {getArea, getLength} from 'ol/sphere';
import {fromLonLat,toLonLat} from 'ol/proj';
import {point, circle,polygon, bboxPolygon, booleanPointInPolygon} from '@turf/turf' 
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import DrawTool from './DrawTool'
import Search    from './Search'
import Popup     from './Popup'
import Compass from './Compass'
import Legend from './Legend'
import Computed from './Computed'
import Forecast from './Forecast'
import getDb from '../../common/rule.js'

export default {
 name:'Map',
 components:{
	 DrawTool,Search,Popup,Compass,Legend,Toolbar,
 },
 props:{
     obj:Object
 },
 created(){
	this.addDataToLocal()
	this.initEvent() 
	
 },
 mounted() {
	this.initMap()
    // console.log(JSON.parse(localStorage.getItem('rad')))
 },
 data(){
	 return{
		 map:'',
		 key:'rad',
		 fields:[0,1],
		 isForecast:false,
		 analysisObj:null,
		 icon:require('../../assets/icon.png'),
		 drawStyle:{
			fill:'#19be6b',
			stroke:'rgba(255, 155, 25, 1)',
			width:3
		 },
		
		 drawToolVisible:false,
		 SearchVisible:false,
		 CompassVisible:false,
		 LegendVisible:false,
		 ComputedVisible:false,
		 ScaleLineVisible:false,
		 OverviewVisible:false,
		 MeasureTooltipVisible:false,
         iconMap:new Map([
			 ['rad',require('../../assets/rad.png')],
			 ['mes',require('../../assets/mes.png')],
			 ['school',require('../../assets/school.png')],
			 ['room',require('../../assets/room.png')],
		 ]),
		 
	 }
 },
 methods:{
	 ...mapMutations([
		 'setProgressValue','setResult'
	 ]),
	 initMap(){
	 	 let {tiles,center,zoom}=this.obj
	 	 let layer=[]
// 	 	 tiles.forEach(e=>{
// 	 		 layer.push(new ol.layer.Tile({
// 	                   source: new ol.source.XYZ({
//                     url: e.url
//                   }),
                 
//                   isGroup: e.isGroup,
//                   name: e.name
//                 }))
// 	 	 })
		
		// this.base='http://localhost:8090/iserver/services/map-China/rest/maps/hebei'
		// this.url="http://localhost:8090/iserver/services/data-China/rest/data";
		this.base='https://iserver.supermap.io/iserver/services/map-world/rest/maps/World'
		 
		 layer.push(
		 new ol.layer.Tile({
			  source: new ol.source.TileSuperMapRest({
				  url: this.base,
				  wrapX: true
			  }),
			  projection: 'EPSG:4326'
		 })
		 )
		
	 	 
		 /* popup */
	 	 this. overlay = new Overlay({
	 	   element: document.getElementById('popup'),
	 	   autoPan: true,
	 	   autoPanAnimation: {
	 		duration: 250
	 	   }
	 	 });
		 /* 视图组件*/
		 /* 鹰眼*/
		 this.overviewMap =null
		 
		
		 /* 缩放滑动*/
		 this.zoomSlider= null
		 /* 图层切换*/
		
	
		 this.pointStyle=[
			 '#016310','#006870','#66bd63','#ffffbf','#fdae61','#f46d43'
		 ]
		 	 
		 /* 比例尺*/
		 this.scaleLine=null
		 
		 this.mousePosition=new MousePosition()
		 /* 全屏*/
		 this.fullScreen=null
		 /* 缩放*/
		 this.zoom=new Zoom()
		 	 
			 
		
		/* 地图对象 */
		this.map= new ol.Map({
		 layers:layer,
		 view: new ol.View({
			 // center: fromLonLat(center),
			 center:center,
			 zoom: 7,
			     projection: 'EPSG:4326'
		 }),
		 overlays: [this.overlay],
		 controls: [],
		 target:this.$refs.map
	  });
	 
	  
	  /* 插值范围*/
	   this.targetExtent=[  12942232.388235057,4841881.948151208,12971431.333039995,4862978.567957917];
	   
	   /* 绘图对象*/
	   this.draw=null
	   
	   /* 测量对象*/
	   this.measureDraw=null
		
		/*几何查询对象  */
		this.rectQuery = new ol.interaction.DragBox({
			  condition: ol.events.condition.platformModifierKeyOnly
		 });
		/* 要素选择器 */
		 this.select = new ol.interaction.Select();
		 
		 /* 要素集合*/
		 this. selectedFeatures=[]
	    
		/* 几何绘制源 */
		this.drawSource = new ol.source.Vector();
		
		/* 几何查询绘制源 */
		this.querySource=new ol.source.Vector();
		
		/* 几何查询所得要素图层 */
		this.queryLayer=new ol.layer.Vector({
		  source: this.querySource,
		 });
		 
		 /* 测量工具*/
		 this.interaction=null
		
		 
		/* 定义数据名称 */
		 this.dataMap=['rad','mes','school','room']
		 
		
		 
		 /* 定义数据映射 */
		 this.layerMap=new Map()
		 for (let f in this.dataMap) {
		 	let source= new ol.source.Vector();
		 	let Layer=new ol.layer.Vector({source: source,name:this.dataMap[f]});
			this.layerMap.set(this.dataMap[f],Layer)
			let path=require('../../assets/mes.png')
		
		 }
		 
		 /* 当前操作图层*/
		 this.currentLayer='rad'
		  
		 /* 几何绘制图层*/
		this.drawLayer = new ol.layer.Vector({
		  name:'drawLayer',
		  source: this.drawSource,
		  style: new Style({
			 fill: new Fill({
			   color: this.drawStyle.fill
			 }),
			 stroke: new Stroke({
			   color: this.drawStyle.stroke,
			   width: this.drawStyle.width
			 }),
			 image: new CircleStyle({
			   radius: 7,
			   fill: new Fill({
				 color: '#ffcc33'
			   })
			 })
		   })
		});
		
	  
	   this. map.addLayer(this.drawLayer);
	   this. map.addLayer(this.queryLayer);
		
		/* 地图点击事件*/
	   this.map.on('singleclick',this.mapClick)
		// this.$refs.map.oncontextmenu=this.stopDraw
	   
	 
	     /* 注销事件*/
		document.getElementById('map').oncontextmenu=e=>{
			this. map.un('pointermove')
			if(this.draw){
				this. map.removeInteraction(this.draw);
			}
			if(this.circleQuery){
				this. map.removeInteraction(this.circleQuery);
			}
			if(this.polygonQuery){
				this. map.removeInteraction(this.polygonQuery);
			}
			if(this.measureDraw){
				this. map.removeInteraction(this.measureDraw);
				
			}
		}
		 window.onkeydown=e=>{
			 if(e.keyCode==13){
				let c=[ 12956085.650863724,4856705.834386309]
				let v=this.map.getView()
				v.setZoom(16)
				v.animate({
				    center: c,
				    duration: 1000
				  });
				 
				 
			 }
		 }
	 	 },
	/* 地图点击事件 */
	 mapClick(e){
         let coordinate=e.coordinate
		  var feature = this.map.forEachFeatureAtPixel(e.pixel, function (feature, layer) {
		    return feature;
		  });
		  	   
		  if (feature) {//values_
		     let item=feature.values_.data
			 if(item!=null){
			  this.$refs.pop.setData(item)
			  this.overlay.setPosition(coordinate);
			 }
		}
		 
		
	 },
	  /* 鼠标移动事件 传输监测值*/
	  moveHandler(e) {
		let c0=e.coordinate,c=[12956850.969894597,4852451.755968768]
		let d=com.GetDistanceByPM(c0,c);
		let vl=2000,l=c0.map(e=>e.toFixed(2))
		if(d>0){
			bus.$emit('computed',{
				d:this.trans3857To4326(c0).map(e=>e.toFixed(2)),
				v:(vl/d).toFixed(2)
			})
		}
	   
	  },
	 initEvent()
	 {
		
		  /* 清除数据*/
	     bus.$on('clear', target => {
			this.clear()
	        
	     });
		 /* 绘制路径*/
		 bus.$on('path',e=>{
			  this.showPath(e)
		 })
		 
		  bus.$on('removePop', target => {
		      this.overlay.setPosition(undefined);
		  });
		  
		 
	
		  
		  
		 /* 显示电磁地图*/
		 bus.$on('dc', target => {
			 /* 激活控件*/
		     this.dcMap()
		  });
		 bus.$on('rmDc', target => {
		        this.map.removeInteraction(this.rectQuery);
		 });
		 /* 检索*/
		 bus.$on('search', target => {
		       this.search(target)
		 });
		 /* 几何查询*/ 
		 bus.$on('geometryQuery', target => {
		      switch(target.type){
				  case 'circle':
				  this.activeCircleQuery()
				  break;
				  case 'polygon':
				  this.activePolygonQuery()
				  break;
			  }
		 });
		 /* 设置当前图层*/
		 bus.$on('setMainLayer', target => {
		        this.currentLayer=(target.type)
		 });
		
		/* 工具条*/
		 bus.$on('oper', target => {
		        this.operate(target)
		 });
	    /* 绘制要素*/
		 bus.$on('draw', target => {
	          this.activeDraw(target)
	     });
		bus.$on('setDrawStyle', target => {
			if(this.drawLayer)
		    this.setDrawLayerStyle(target)
		}); 
		
	 },
	 getDb(p,pdb,g){
	 	let s=Math.sqrt(100*p*g/(4*Math.PI*pdb))
	 	return s.toFixed(2)
	 },
	 /* 台风路径*/
	 showPath(i){
		 this.clear() 
		 if(i&&i.num.length>0){
			 i.num.forEach((e,j)=>{
				 if((e['经度(0.1N)']&&e['纬度(0.1N)'])){
					 if(j){
						 let c=Math.ceil(Math.random()*this.pointStyle.length-1)
						 let ci=parseInt(e['强度'])>5?5:parseInt(e['强度'])
						  let item={
							  '经度':e['经度(0.1N)'],
							  '纬度': e['纬度(0.1N)'],
							  'color':this.pointStyle[ci]
						  };
						 
						 this.addPoint(item)	 
					 }
			    }
			 })
		 }
	 },
	 /* 预测*/
	 forecast(r,center){
		 this.addCircle({center:center,radius:parseFloat(r)})
		 //分析
		 
		 let t=this.trans3857To4326(center),fie=['room','school']
		 let result=[]
		 for(let i  in fie){
			 let d=JSON.parse(localStorage.getItem((fie[i])))
			 if(d&&d.length>0){
				
				 d.forEach(e=>{
					  let lon=e.经度||e.lon,lat=e.纬度||e.lat
					  if(this.pointInPolygon([lon,lat],{center:t,radius:parseFloat(r)})){
						result.push(e)  
						 this.addMarker2({经度:lon,纬度:lat},this.iconMap.get(fie[i]),fie[i])
					  }
				 })
			 }
		 }
		 this.setResult(result)
		
	 },
	 addDataToLocal(){
		localStorage.setItem('room',JSON.stringify(data.room)) 
		localStorage.setItem('school',JSON.stringify(data.school)) 
	 },
	 removeDraw(){
		  this.map.removeInteraction(this.draw);
	 },
	 clear(){
		if(this.drawSource){
		 this.drawSource.clear()	
		}
		if(this.querySource){
			this.querySource.clear() 
		} 
		this.overlay.setPosition(undefined);
	  if(this.canvasLayer){
		  let e=document.getElementById('canvas')
		  if(e){document.body.removeChild(d)}
		  this.map.removeLayer(this.canvasLayer);
		  this.canvasLayer=null
	  }
	  
	  
	  let measureTip=this.map.getOverlays()
	 
	  if(measureTip.length>0){
		 for (let var1 in measureTip) {
		 	this.map.removeOverlay(var1)
		 }
	  }
	    bus.$emit('resetCheck')
	 },
	 setDrawLayerStyle(target){
		 this.drawLayer.setStyle(new Style({
		   fill: new Fill({
		     color: target.fill
		   }),
		   stroke: new Stroke({
		     color: target.stroke,
		     width: target.width
		   }),
		   image: new CircleStyle({
		     radius: 7,
		     fill: new Fill({
		       color: target.fill
		     })
		   })
		 }))
	 },
	
	 operate(target){
		switch(target.key){
		   case 'zoomIn':
		   this.zoomIn()
		   break;
		   case 'zoomOut':
		   this.zoomOut()
		   break;
		   case 'searchVisible':
		   this.SearchVisible=target.value
		   break;
		   case 'clear':
		   this.clear()
		   break;
		   case 'fullScreen':
		   if (target.value) {
			com.fullScreen()	
		   } else{
			com.exitFullscreen()
		   }
		   break;
		   case 'print':

		   break;
		   case 'geo':
		   let c=fromLonLat([143.5,15])
		   this.flyTo(c,()=>{
			   this.map.getView().setZoom(4)
		   })
		   
		   
		   break;
		   case 'draw':
		   this.drawToolVisible=target.value
		   if(!this.drawToolVisible)
			 this.removeDraw();
		   break;
		   case 'distance':
		   this.measure( 'LineString');
		   break;
		   case 'area':
		     this.measure( 'Polygon');
		   break;
		   // 视图组件
		   case 'compass':
		   this.CompassVisible=target.value
		   break;
		   case 'legend':
		   this.LegendVisible=target.value
		   break;
		   case 'scaleLine':
		   if(target.value){
			   if(this.scaleLine==null){
				   this.scaleLine=new ScaleLine()
				   this.map.addControl(this.scaleLine)
			   }
		   }else{
			    if(this.scaleLine)
				 this.map.removeControl(this.scaleLine)
				 this.scaleLine=null
		   }
		   break;
		   case 'eagleEye':
		   if(target.value){
			   if(this.overviewMap==null){
				   this.overviewMap= new OverviewMap({
		   layers: this.map.getLayers().getArray()
		 });
				   this.map.addControl(this.overviewMap)
			   }
		   }else{
				if(this.overviewMap)
				 this.map.removeControl(this.overviewMap)
				 this.overviewMap=null
		   }
		   break;
		   case 'layerManager':
		   break;
		   case 'zoomSlide':
		  
		   if(target.value){
			   if(this.zoomSlider==null){
				   this.zoomSlider=  new ZoomSlider()
				   this.map.addControl(this.zoomSlider)
			   }
		     }else{
				if(this.zoomSlider)
				 this.map.removeControl(this.zoomSlider)
				 this.zoomSlider=null
		     }
		   break;
		   case 'fullScreen':
		   if(target.value){
			   if(this.fullScreen==null){
				   this.fullScreen= new FullScreen()
				   this.map.addControl(this.fullScreen)
			   }
		     }else{
				if(this.fullScreen)
				 this.map.removeControl(this.fullScreen)
				 this.fullScreen=null
		     }
		   break;
		}  
	 },
	 /* 检索*/
	 search(target){
	
		
		if(target.type){
			
			/* 判断是否选择 */
			
		    let layer=this.layerMap.get(target.type)
			if(target.value){
				// getSource()
			     this.map.addLayer(layer)
				 this.addFeatures(target);
			}else{
				 this.map.removeLayer(layer)
			}
		}else{
			/* 根据关键字查询 */
			
			
			
			let d=JSON.parse(localStorage.getItem('rad'))
			if (target!=='') {
				if(d&&d.length>0){
					let i=d.findIndex(e=>e.ID==target)
					if(i>-1){
						let item=d[i]
						this.addMarker(item,this.iconMap.get('rad'))
					}
				}
			}else{
				d.forEach(e=>{
					this.addMarker(e,target.icon)
				})
			}
			
		} 
	 },
	 /* 向指定图层添加要素*/
	 addFeatures(t){
		 
	  let layer=this.layerMap.get(t.type)
	  if(layer){layer.getSource().clear();}
	  let d=JSON.parse(localStorage.getItem(t.type))
	  if(d&&d.length>0){
		  d.forEach((e,i,d)=>{
			  if(e.lon){
				  if(t.type==='mes'){
					  if(i%600==0){
						  this.addMarker1({经度:e.lon,纬度:e.lat},t.icon,t.type)
					  }
				  }else{
					  this.addMarker1({经度:e.lon,纬度:e.lat},t.icon,t.type)
				  }
				  
			  }else{
				  this.addMarker1(e,t.icon,t.type)
			  }
		  })
	  }
     },
	 /*查找指定图层 */
	 findLayerFromMap(name){
        let layer=null
		 if(this.map.getLayers){
			layer=this.map.getLayers().getArray()
			 for(let l in layer){
				 if(l.get&&l.get("name").indexOf(name)>-1){
					 return l
					 }
			 } 
		 }
		 return layer
		
	 },
	 /* 定位*/
    flyTo(location, done) {
	   let view=this.map.getView()
	   var duration = 2000;
	   var zoom = view.getZoom();
	   var parts = 2;
	   var called = false;
	   function callback(complete) {
	     --parts;
	     if (called) {
	       return;
	     }
	     if (parts === 0 || !complete) {
	       called = true;
	       done(complete);
	     }
	   }
	   view.animate({
	     center: location,
	     duration: duration
	   }, callback);
	   view.animate({
	     zoom: zoom - 1,
	     duration: duration / 2
	   }, {
	     zoom: zoom,
	     duration: duration / 2
	   }, callback);
	 },
 
	
	 zoomIn() {
	         var view = this.map.getView();
	         var zoom = view.getZoom();
	         view.setZoom(zoom + 1);
	     },
	 zoomOut() {
	         var view = this.map.getView();
	         var zoom = view.getZoom();
	         view.setZoom(zoom - 1);
	     },
    getQueryDraw(type){
		return new Draw({
		source: this.querySource,
		type:type
	 });
	},
	 /* 激活标注类型*/
	 activeDraw(t) {
	this. map.removeInteraction(this.draw);
	   if (t.type !== 'None') {
	     this.draw = new Draw({
	       source: this.drawSource,
	       type: t.type
	     });
	    this. map.addInteraction(this.draw);
	   }
	 },
	 activeCircleQuery(){
		  if(this.circleQuery){
			  this. map.removeInteraction(this.circleQuery);
		  }
		  this.circleQuery=this.getQueryDraw('Circle')
		  this. map.addInteraction(this.circleQuery);//几何查询
		  this.circleQuery.on('drawend',this.queryDrawCallBack)
		  
	 },
	 activePolygonQuery(){
		if( this.polygonQuery){
         this. map.removeInteraction( this.polygonQuery);
		  }
		  this.polygonQuery=this.getQueryDraw('Polygon')
          this. map.addInteraction(this.polygonQuery);//几何查询
		  this.polygonQuery.on('drawend',this.queryDrawCallBack)
	 },
	 activeRectQuery(){
	 		 this. map.addInteraction(this.rectQuery);//几何查询
	 },
	 /* 几何查询回调*/
	 queryDrawCallBack(e){
		 let c=e.feature.values_.geometry.flatCoordinates,p=null
		 if (c.length==4) {
		 	/* 圆 */
			let d=com.GetDistanceByPM([c[0],c[1]],[c[2],c[3]])
			p={center:toLonLat([c[0],c[1]]),radius:d}
			
		}else{
			/* 多边形 */
			p=[this.getPathFromGeometry(c)]
		}
		let type=this.currentLayer
		 if (type!=='') {
		 	let da=JSON.parse(localStorage.getItem(type))
			let result=[]
			da.forEach(e=>{
				let lon=e.经度||e.lon,lat=e.纬度||e.lat
				if (this.pointInPolygon([lon,lat],p)) {
					this.addMarker(e,this.iconMap.get(type),this.querySource)
					result.push(e)
				}
			})
			this.setResult(result)
		  }
		},
	 trans3857To4326(p){
		 return ol.proj.transform(p, 'EPSG:3857','EPSG:4326' );
	 },
	 /* 拓扑关系判断*/
	 pointInPolygon(p,c){
		 let o={}
		 if (c.center) {
		 	var options = { units: 'meters', properties: {foo: 'bar'}};
		 	o= circle(c.center, c.radius, options);
		 }else{
			 o=polygon(c);
		 }
	 	 return  booleanPointInPolygon(point(p), o,{ignoreBoundary:false})
	  },
	 /* 获取地图中心*/
	 getCenter(){
		let mapExtent = this.map.getView().calculateExtent(this.map.getSize())
		  return ol.extent.getCenter(mapExtent)
	 },
	 /*路径点转换 [c[0],c[1],c[2],c[3]]=>[[],[]]*/
	 getPathFromGeometry(a){
		 let result=[],i=0,j=1;
		while(i<a.length&&j<a.length){
			result.push(toLonLat([a[i],a[j]]))
			i+=2
			j+=2
		}
		return result
	 },
	 
   // marker
   /* 测试添加标注*/
	   addPoint(e){
		   let c= fromLonLat([e.经度,e.纬度])
		   let v=e.监测值||''
			 var iconFeature = new ol.Feature({
			   geometry:new ol.geom.Point(c),
				 name: 'point',
				 value:v,
			 });
			 let p=require('../../assets/point.png')
			 let s=new Style({
			 		image:new ol.style.Icon({
			 		color:e.color,
			 		src:p,
			 		})
			 	})
			
			iconFeature.setStyle(s)
		this.querySource.addFeature(iconFeature)
	   },
	/* 添加marker */
     addMarker(e,path,dataSource){
		let lon=e.经度||e.lon,lat=e.纬度||e.lat
		let source=dataSource|| this.querySource
		let c= fromLonLat([lon,lat])
		let v=e.监测值||'',id=e.ID||''
		 var iconFeature = new ol.Feature({
		   geometry:new ol.geom.Point(c),
		   type:'icon',
		   name: id,
		   value:v,
		 });
		var iconStyle = new ol.style.Style({
		   image: new ol.style.Icon(({
		     anchor: [0.5, 1],
		     src: path
		   }))
		 });
		 iconFeature.setStyle(iconStyle);
		 source.addFeature(iconFeature)
	},
	 /*基于映射图层添加图标 */
	 addMarker1(e,path,key){
	 		let c= fromLonLat([e.经度,e.纬度])
	 		let v=e.监测值||''
	 		 var iconFeature = new ol.Feature({
	 		   geometry:new ol.geom.Point(c),
	 		   type:'icon',
	 		   name: e.ID,
	 		   value:v,
	 		 });
	 		var iconStyle = new ol.style.Style({
	 		   image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
	 		     anchor: [0.5, 1],
	 		     src: path
	 		   }))
	 		 });
		 iconFeature.setStyle(iconStyle);
		 this.layerMap.get(key).getSource().addFeature(iconFeature)
	 },
	 /*基于查询结果图层添加图标 */
	 addMarker2(e,path,key){
	 		let c= fromLonLat([e.经度,e.纬度])
	 		let v=e.监测值||''
	 		 var iconFeature = new ol.Feature({
	 		   geometry:new ol.geom.Point(c),
	 		   type:'icon',
	 		   name: e.ID,
	 		   value:v,
	 		 });
	 		var iconStyle = new ol.style.Style({
	 		   image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
	 		     anchor: [0.5, 1],
	 		     src: path
	 		   }))
	 		 });
	 		 iconFeature.setStyle(iconStyle);
	 		this.querySource.addFeature(iconFeature)
	 },
	 /*基于查询结果图层添加图标 */
	 addMarker3(e,path,key){
		let c= fromLonLat([e.经度,e.纬度])
		let v=e.监测值||''
		 var iconFeature = new ol.Feature({
		   geometry:new ol.geom.Point(c),
		   type:'icon',
		 });
		var iconStyle = new ol.style.Style({
		   image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
			 anchor: [0.5, 1],
			 src: path
		   }))
		 });
		 iconFeature.setStyle(iconStyle);
		this.drawSource.addFeature(iconFeature)
	 },
	 
	 /* 画圆*/
	 addCircle(e){
		 var iconFeature = new ol.Feature({
		    geometry:new ol.geom.Circle(e.center,e.radius),
			type:'circle'
		  });
		 var iconStyle = new ol.style.Style({
		    fill: new Fill({
		      color: 'rgb(12,124,210,0.4)'
		    }),
			stroke: new Stroke({
							 color: 'rgba(0, 0, 0, 0.5)',
							 lineDash: [10, 10],
							 width: 2
			}),
			});
		  
		  iconFeature.setStyle(iconStyle);
		  this.drawSource.addFeature(iconFeature)
		  
	 },
	 /* 异步加载数据*/
	 	
	  loadRadiant(){
		 let d=JSON.parse(localStorage.getItem('mes'));
		 let path=this.iconMap.get('mes')
		
		if (d&&d.length>0) {
			d.forEach((e,index,d)=>{
			if(index%600==0){
			 this.addPoint(e)
			
			}
			this.setProgressValue(Math.round(index/d.length*100));
			})
			
		    setTimeout(e=>{
				this.setProgressValue(null);
			},2000)	
		  }
	 },
	 /* 电磁地图*/
	 dcMap(){
		  this.setProgressValue(1);
		 this.loadRadiant()
		
		 this. selectedFeatures = this.select.getFeatures();
		 let extent=this.targetExtent;
		 this.querySource .forEachFeatureIntersectingExtent(extent, (feature)=> {
		        this. selectedFeatures.push(feature);
		});
		this.drawKriging(this. selectedFeatures,extent);
		 // this.rectQuery.on('boxend', ()=>{
		 //     let extent = this.rectQuery.getGeometry().getExtent();
		   
		 // });
		 // this.rectQuery.on('boxstart', ()=>{
		 //    this. selectedFeatures.clear();
		 // });
	 },
	 //插值
	  drawKriging (selectedFeatures,extent){
		         let canvasAlpha=100,maxValue=10000, 
colors=["#006837", "#1a9850", "#66bd63", "#a6d96a", "#d9ef8b", "#ffffbf","#fee08b", "#fdae61", "#f46d43", "#d73027", "#a50026"];
	             colors=colors.reverse()
				 let values = [], lngs = [], lats = [];
				 	selectedFeatures.forEach(feature=>{
					 values.push(feature.values_.value);
					 lngs.push(feature.values_.geometry.flatCoordinates[0]);
					 lats.push(feature.values_.geometry.flatCoordinates[1]);
				  });
	            //model还可选'gaussian','spherical'
	             if (values.length > 3) {
	                 let letiogram = this.kriging.train(values, lngs, lats,
	                      'exponential', 0, canvasAlpha);
	                 let ex = extent;
					  let polygons=[];
					         polygons.push([[extent[0],extent[1]],[extent[0],extent[3]],
					             [extent[2],extent[3]],[extent[2],extent[1]]]);
	                 let grid = this.kriging.grid(polygons, letiogram, (ex[2] - ex[0]) / 200);               
	                 //移除已有图层
	                 if (this.canvasLayer !== null) {
						 
	                     this.map.removeLayer(this.canvasLayer);
	                 }
	                 //创建新图层
	                this. canvasLayer = new ol.layer.Image({
	                     source: new ol.source.ImageCanvas({
	                         canvasFunction: (extent, resolution, pixelRatio, size, projection) => {
	                             
	                             let canvas = document.createElement('canvas');
								 canvas.setAttribute('id','canvas')
	                             canvas.width = size[0];
	                             canvas.height = size[1];
	                             canvas.style.display = 'block';
	                             //设置canvas透明度
	                             canvas.getContext('2d').globalAlpha = 0.3;
	                             //使用分层设色渲染
	                             this.kriging.plot(canvas, grid,
	                                 [extent[0], extent[2]], [extent[1], extent[3]], colors);                            
	                             return canvas;
	                         },
	                         projection: 'EPSG:3857'
	                     })
	                 })             
	                 //向map添加图层
	                 this.map.addLayer(this.canvasLayer);
					 this. selectedFeatures.clear();
	             } else {
	                 // alert("有效样点个数不足，无法插值");
	             }
	         },
			 /* 地图测量*/
			 registerMeasure(type){
				 /**
				  * Currently drawn feature.
				  * @type {import("../src/ol/Feature.js").default}
				  */
				 var sketch;
				 
				 
				 /**
				  * The help tooltip element.
				  * @type {HTMLElement}
				  */
				 var helpTooltipElement;
				 
				 
				 /**
				  * Overlay to show the help messages.
				  * @type {Overlay}
				  */
				 var helpTooltip;
				 
				 
				 /**
				  * The measure tooltip element.
				  * @type {HTMLElement}
				  */
				 var measureTooltipElement;
				 
				 
				 /**
				  * Overlay to show the measurement.
				  * @type {Overlay}
				  */
				 var measureTooltip;
				 
				 
				 /**
				  * Message to show when the user is drawing a polygon.
				  * @type {string}点击继续绘制多边形
				  */
				 var continuePolygonMsg = '';
				 
				 
				 /**
				  * Message to show when the user is drawing a line.
				  * @type {string}点击继续绘制线段
				  */
				 var continueLineMsg = '';
				 if(this.measureDraw){
					 this.map.removeInteraction(this.measureDraw)
					 this.map.un('pointermove')
				 }
				 
				 this.measureDraw=new Draw({
			 source: this.drawSource,
			 type: type,
			 style: new Style({
			   fill: new Fill({
				 color: 'rgba(255, 255, 255, 0.2)'
			   }),
			   stroke: new Stroke({
				 color: 'rgba(0, 0, 0, 0.5)',
				 lineDash: [10, 10],
				 width: 2
			   }),
			   image: new CircleStyle({
				 radius: 5,
				 stroke: new Stroke({
				   color: 'rgba(0, 0, 0, 0.7)'
				 }),
				 fill: new Fill({
				   color: 'rgba(255, 255, 255, 0.2)'
				 })
			   })
			 })
		   });
			
				 this.map.addInteraction(this.measureDraw);
				 /**
				  * Handle pointer move.
				  * @param {import("../src/ol/MapBrowserEvent").default} evt The event.
				  */
				  createMeasureTooltip(this.map);
				  createHelpTooltip(this.map);
				  
				 var pointerMoveHandler = function(evt) {
				   if (evt.dragging) {
				     return;
				   }
				  
				   /** @type {string}点击开始绘制 */
				   var helpMsg = '';
				 
				   if (sketch) {
				     var geom = sketch.getGeometry();
				     if (geom instanceof Polygon) {
				       helpMsg = continuePolygonMsg;
				     } else if (geom instanceof LineString) {
				       helpMsg = continueLineMsg;
				     }
				   }
				 
				  /// helpTooltipElement.innerHTML = helpMsg;
				  // helpTooltip.setPosition(evt.coordinate);
				 
				   //helpTooltipElement.classList.remove('hidden');
				 };
				  this.map.on('pointermove', pointerMoveHandler);
				 
				
				 
				
				 
				 this.map.getViewport().addEventListener('mouseout', function() {
				   helpTooltipElement.classList.add('hidden');
				 });
				 
				
				 
				 
				 
				 /**
				  * Format length output.
				  * @param {LineString} line The line.
				  * @return {string} The formatted length.
				  */
				 var formatLength = function(line) {
				   var length = getLength(line);
				   var output;
				   if (length > 100) {
				     output = (Math.round(length / 1000 * 100) / 100) +
				         ' ' + 'km';
				   } else {
				     output = (Math.round(length * 100) / 100) +
				         ' ' + 'm';
				   }
				   return output;
				 };
				 
				 
				 /**
				  * Format area output.
				  * @param {Polygon} polygon The polygon.
				  * @return {string} Formatted area.
				  */
				 var formatArea = function(polygon) {
				   var area = getArea(polygon);
				   var output;
				   if (area > 10000) {
				     output = (Math.round(area / 1000000 * 100) / 100) +
				         ' ' + 'km2';
				   } else {
				     output = (Math.round(area * 100) / 100) +
				         ' ' + 'm2';
				   }
				   return output;
				 };
				
				
				   addInteraction(this);
				
				 function addInteraction(t) {
				 
				
				  
				   var listener;
				  t.measureDraw.on('drawstart',(evt) =>{
				       // set sketch
				       sketch = evt.feature;
				  
				       /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
				       var tooltipCoord = evt.coordinate;
				 
				       listener = sketch.getGeometry().on('change', function(evt) {
				         var geom = evt.target;
				         var output;
				         if (geom instanceof Polygon) {
				           output = formatArea(geom);
				           tooltipCoord = geom.getInteriorPoint().getCoordinates();
				         } else if (geom instanceof LineString) {
				           output = formatLength(geom);
				           tooltipCoord = geom.getLastCoordinate();
				         }
						 if (measureTooltipElement) {
						 	 measureTooltipElement.innerHTML = output;
						 	// measureTooltip.setPosition(tooltipCoord);
						 }
				         
				       });
				     });
				 
				   t.measureDraw.on('drawend',
				     ()=> {
						 if(measureTooltipElement!=null){
						alert(measureTooltipElement.innerHTML)	 
						 }
					  
				       measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
				       measureTooltip.setOffset([0, -7]);
				       // unset sketch
				       sketch = null;
				       // unset tooltip so that a new one can be created
				       measureTooltipElement = null;
				       //createMeasureTooltip(t.map);
				       unByKey(listener);
					   
					   
				     });
				 }
				 
				 
				 /**
				  * Creates a new help tooltip
				  */
				 function createHelpTooltip(map) {
				   if (helpTooltipElement) {
				     helpTooltipElement.parentNode.removeChild(helpTooltipElement);
				   }
				   helpTooltipElement = document.createElement('div');
				   helpTooltipElement.className = 'ol-tooltip hidden';
				   helpTooltip = new Overlay({
				     element: helpTooltipElement,
				     offset: [15, 0],
				     positioning: 'center-left'
				   });
				   map.addOverlay(helpTooltip);
				 }
				 
				 
				 /**
				  * Creates a new measure tooltip
				  */
				 function createMeasureTooltip(map){
					 
				  if (measureTooltipElement) {
				     measureTooltipElement.parentNode.removeChild(measureTooltipElement);
				   }
				   measureTooltipElement = document.createElement('div');
				   measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
				   measureTooltip = new Overlay({
				     element: measureTooltipElement,
				     offset: [0, -15],
				     positioning: 'bottom-center'
				   });
				   map.addOverlay(measureTooltip);
				 }

			 },
			/* 测距测面 */
			measure(type){
				   let feature='';
				   let typeMap=new Map([
					   ['LineString','米'],
					   ['Polygon','平方米']
				   ])
				   this. interaction = new ol.interaction.Draw({
				        source: this.drawSource,
				        type: type
				    });
				    this.interaction.on('drawstart', function (evt) {
				        feature = evt.feature;
				    });
				   this. interaction.on('drawend', ()=> {
				        var MeasureParam = new SuperMap.MeasureParameters(feature.getGeometry());
				        let m=new ol.supermap.MeasureService(this.base, {measureMode: ""})
						if(type==='LineString'){
						m.measureDistance(MeasureParam,  (serviceResult)=> {
							alert(serviceResult.result.distance+ typeMap.get(type));
						
						});
						}else{
						m.measureArea(MeasureParam,  (serviceResult)=> {
							alert(serviceResult.result.area + typeMap.get(type));
						
						});
					 }
						this.lostFocus()
				    });
				
				  this.map.addInteraction(this.interaction);
			},
			/* 移除测量工具 */
			lostFocus(){
				this.map.removeInteraction(this.interaction);
			},
			 /* 查询 */
			 /* 根据id查询 */
			 queryById(ds,ids){
			 	//指定ID查询处理
			 	let {url }= this;
			 	//数据集ID查询服务参数
			 	var idsParam = new SuperMap.GetFeaturesByIDsParameters({
			 	    IDs:ids,
			 	    datasetNames: ds
			 	});
			 	//向服务器发送请求，并获取结��?
			 	new ol.supermap.FeatureService(url).getFeaturesByIDs(idsParam,e=>{
			 		this.showResult(e)
			 	} );
			 },
			 /* SQL */
			 queryBySql(ds,sql){
			 	let sqlParam = new SuperMap.GetFeaturesBySQLParameters({
			 		queryParameter: {
			 		  attributeFilter: sql
			 		},
			 		datasetNames: ds
			 	});
			 	new ol.supermap.FeatureService(this.url).getFeaturesBySQL(sqlParam, e=>{
			 		this.showResult(e)
			 	} );
			 },
			 
			 /* 矩形 */
			 queryByReact(ds,polygon){
			 	//添加查询区域
			 	// var polygon = new ol.geom.Polygon([[[-20, 20], [-20, -20], [20, -20], [20, 20], [-20, 20]]]);
			 	var polygonSource = new ol.source.Vector({
			 		features: [new ol.Feature(polygon)],
			 		wrapX: false
			 	});
			 	vectorLayer = new ol.layer.Vector({
			 		source: polygonSource,
			 		style: new ol.style.Style({
			 			stroke: new ol.style.Stroke({
			 				color: 'red',
			 				width: 3
			 			}),
			 			fill: new ol.style.Fill({
			 				color: 'rgba(0, 0, 255, 0.1)'
			 			})
			 		})
			 	});
			 	this.map.addLayer(vectorLayer);
			 	//创建集Bounds查询服务
			 	var boundsParam = new SuperMap.GetFeaturesByBoundsParameters({
			 		datasetNames: ds,
			 		bounds: polygon.getExtent()
			 	});
			 	new ol.supermap.FeatureService(this.url).getFeaturesByBounds(boundsParam, e=>{
			 		this.showResult(e)
			 	} );
			 },
			 /*任意图形 */
			 queryByPolygon(ds,polygon, mode){
			 	 // polygon = new ol.geom.Polygon([[[0, 0], [-10, 30], [-30, 0], [0, 0]]])
			 	// 设置几何查询参数
			 	
			 	var geometryParam = new SuperMap.GetFeaturesByGeometryParameters({
			 	    datasetNames:ds,
			 	    geometry: polygon,
			 	    spatialQueryMode: mode // 相交空间查询模式 "INTERSECT"
			 	});
			 	// 创建几何范围查询实例
			 	new ol.supermap.FeatureService(this.url).getFeaturesByGeometry(geometryParam, e=>{
			 		this.showResult(e)
			 	} );
			 },
			 
			 /* 缓冲��?*/
			 queryByBuffer(ds,polygon, length){
			 	 // var polygon = new ol.geom.Polygon([[[-20, 20], [-20, -20], [20, -20], [20, 20], [-20, 20]]]);
			 	        var polygonSource = new ol.source.Vector({
			 	            features: [new ol.Feature(polygon)],
			 	            wrapX: false
			 	        });
			 	        vectorLayer = new ol.layer.Vector({
			 	            source: polygonSource,
			 	            style: new ol.style.Style({
			 	                stroke: new ol.style.Stroke({
			 	                    color: 'red',
			 	                    width: 3
			 	                }),
			 	                fill: new ol.style.Fill({
			 	                    color: 'rgba(0, 0, 255, 0.1)'
			 	                })
			 	            })
			 	        });
			 	        map.addLayer(vectorLayer);
			 	
			 	        var bufferParam = new SuperMap.GetFeaturesByBufferParameters({
			 	            datasetNames: ds,
			 	            bufferDistance: length,
			 	            geometry: polygon
			 	        });
			 	        new ol.supermap.FeatureService(url).getFeaturesByBuffer(bufferParam,e=>{
			 		this.showResult(e)
			 	}  );
			 },
			 /* 显示查询结果 */
			 showResult(serviceResult){
			  	if (!serviceResult.result) {
			  		return
			  	}
			 	
			 	let f=serviceResult.result.features;
			 	try{
			 		
			 		if(f.features&&f.features.length>0){
			 			 f=(new ol.format.GeoJSON()).readFeatures(f)
			 			f.forEach(e=>{
			 			  this.resultSource.addFeature(e)	
			 			})
			 		}else{
			 			
			 		}
			 	}catch(e){
			 		console.log(e)
			 	}
			 	
			  	
			  	
			 },
			 
			 
			 /* 单值专题图 */
			 singleValue(ds,name,where,){
			   let getFeatureParam, getFeatureBySQLService, getFeatureBySQLParams;
			   getFeatureParam = new SuperMap.FilterParameter({
			       name: name,//��?
			       attributeFilter:where
			   });
			   getFeatureBySQLParams = new SuperMap.GetFeaturesBySQLParameters({
			       queryParameter: getFeatureParam,
			       toIndex: 500,
			       datasetNames: ds
			   });
			   getFeatureBySQLService = new SuperMap.GetFeaturesBySQLService(this.url, {
			       format: SuperMap.DataFormat.ISERVER,
			       eventListeners: {"processCompleted": this.processCompleted, "processFailed": this.processFailed}
			   });
			   getFeatureBySQLService.processAsync(getFeatureBySQLParams);
			 
			  },
			 processCompleted(getFeaturesEventArgs) {
			     var result = getFeaturesEventArgs.result;
			     var feas = [];
			     if (result && result.features) {
			         var features = result.features
			         var IHFeas = []; //岛洞多面
			         for (var i = 0, len = features.length; i < len; i++) {
			             var feature = features[i];
			             var smid = feature.fieldValues[0];
			             if (smid === "86" || smid === "87" || smid === "89") {
			                 // islandHoleHandlerForFeature 处理岛洞��?
			                 IHFeas.push(islandHoleHandlerForFeature(feature));
			             }
			             else {
			                 feas.push(feature);
			             }
			         }
			         // 岛洞多面要素必需在其他要素之前添��?
			         feas = IHFeas.concat(feas);
			         themeSource = new ol.source.Unique("ThemeLayer", {
			             map: this.map,
			             attributions: " ",
			             style: {
			                 shadowBlur: 3,
			                 shadowColor: "#000000",
			                 shadowOffsetX: 1,
			                 shadowOffsetY: 1,
			                 fillColor: "#FFFFFF"
			             },
			             isHoverAble: true,
			             highlightStyle: {
			                 stroke: true,
			                 strokeWidth: 2,
			                 strokeColor: 'blue',
			                 fillColor: "#00F5FF",
			                 fillOpacity: 0.2
			             },
			             themeField: "LANDTYPE",
			             styleGroups: [
			                 // {
			                 //     value: "草地",
			                 //     style: {
			                 //         fillColor: "#C1FFC1"
			                 //     }
			                 // },
			                 // {
			                 //     value: "城市",
			                 //     style: {
			                 //         fillColor: "#CD7054"
			                 //     }
			                 // },
			                 // {
			                 //     value: "灌丛",
			                 //     style: {
			                 //         fillColor: "#7CCD7C"
			                 //     }
			                 // },
			                 // {
			                 //     value: "旱地",
			                 //     style: {
			                 //         fillColor: "#EE9A49"
			                 //     }
			                 // },
			                 // {
			                 //     value: "湖泊水库",
			                 //     style: {
			                 //         fillColor: "#8EE5EE"
			                 //     }
			                 // },
			                 // {
			                 //     value: "经济��?,
			                 //     style: {
			                 //         fillColor: "#548B54"
			                 //     }
			                 // },
			                 // {
			                 //     value: "沙漠",
			                 //     style: {
			                 //         fillColor: "#DEB887"
			                 //     }
			                 // },
			                 // {
			                 //     value: "水浇��?,
			                 //     style: {
			                 //         fillColor: "#E0FFFF"
			                 //     }
			                 // },
			                 // {
			                 //     value: "水田",
			                 //     style: {
			                 //         fillColor: "#388E8E"
			                 //     }
			                 // },
			                 // {
			                 //     value: "用材��?,
			                 //     style: {
			                 //         fillColor: "#556B2F"
			                 //     }
			                 // },
			                 // {
			                 //     value: "沼泽",
			                 //     style: {
			                 //         fillColor: "#2F4F4F"
			                 //     }
			                 // },
			                 // {
			                 //     value: "缺省风格",
			                 //     style: {
			                 //         fillColor: "#ABABAB"
			                 //     }
			                 // }
			             ]
			         });
			         themeSource.addFeatures(feas);
			         //专题图层 mousemove 事件
			         themeSource.on('mousemove', function (e) {
			             if (e.target && e.target.refDataID) {
			                 document.getElementById("infoBox").style.display = "block";
			                 var fid = e.target.refDataID;
			                 var fea = themeSource.getFeatureById(fid);
			                 if (fea) {
			                     // document.getElementById("infoContent").innerHTML = "";
			                     // document.getElementById("infoContent").innerHTML += "ID: " + fea.attributes.SMID + "<br/>";
			                     // document.getElementById("infoContent").innerHTML += resources.text_landType+": " + fea.attributes.LANDTYPE + "<br/>";
			                     // document.getElementById("infoContent").innerHTML += resources.text_area + parseFloat(fea.attributes.SMAREA).toFixed(5) + "<br/>";
			                 }
			             }
			             else {
			                 // document.getElementById("infoContent").innerHTML = "";
			                 // document.getElementById("infoBox").style.display = "none";
			             }
			         });
			 		
			         var pointerInteraction = new ol.interaction.Pointer({
			             handleMoveEvent: function (event) {
			                 themeSource.fire('mousemove', event);
			             }
			         });
			         map.addInteraction(pointerInteraction);
			         themeLayer = new ol.layer.Image({
			             source: themeSource
			         });
			         themeLayer.setOpacity(0.8);
			        this. map.addLayer(themeLayer);
			     }
			 },
			 processFailed(e){
			 	console.log('查询失败'+e)
			 },
			 /* 网络分析*/
			 
			 /* 最佳路径规划*/
		    findPathProcess() {
			         //添加站点
			         var stopMarker1 = new ol.Overlay({
			             element: document.getElementById('stopMarker1'),
			             positioning: 'center-center',
			             position: [4000, -3000]
			         });
			         var stopMarker2 = new ol.Overlay({
			             element: document.getElementById('stopMarker2'),
			             positioning: 'center-center',
			             position: [5500, -2500]
			         });
			         var stopMarker3 = new ol.Overlay({
			             element: document.getElementById('stopMarker3'),
			             positioning: 'center-center',
			             position: [6900, -4000]
			         });
			         map.addOverlay(stopMarker1);
			         map.addOverlay(stopMarker2);
			         map.addOverlay(stopMarker3);
			 
			         //创建最佳路径分析参数实例
			         var resultSetting = new SuperMap.TransportationAnalystResultSetting({
			             returnEdgeFeatures: true,
			             returnEdgeGeometry: true,
			             returnEdgeIDs: true,
			             returnNodeFeatures: true,
			             returnNodeGeometry: true,
			             returnNodeIDs: true,
			             returnPathGuides: true,
			             returnRoutes: true
			         });
			         var analystParameter = new SuperMap.TransportationAnalystParameter({
			             resultSetting: resultSetting,
			             weightFieldName: "length"
			         });
			         var findPathParameter = new SuperMap.FindPathParameters({
			             isAnalyzeById: false,
			             nodes: [new ol.geom.Point([4000, -3000]), new ol.geom.Point([5500, -2500]), new ol.geom.Point([6900, -4000])],
			             hasLeastEdgeCount: false,
			             parameter: analystParameter
			         });
			 
			         //进行查找
			         new ol.supermap.NetworkAnalystService(serviceUrl).findPath(findPathParameter, function (serviceResult) {
			             var guideLayerStyle = new ol.style.Style({
			                 image: new ol.style.Icon(({
			                     src: '../img/walk.png',
			                     size: [20, 20]
			                 }))
			             });
			             var routeLayerStyle = new ol.style.Style({
			                 stroke: new ol.style.Stroke({
			                     color: 'rgba(100, 100, 225, 10)',
			                     width: 3
			                 }),
			                 fill: new ol.style.Fill({
			                     color: 'rgba(0, 0, 255, 0.1)'
			                 })
			             });
			             serviceResult.result.pathList.map(function (result) {
			                 //添加分析出的路线
			                 var routeSource = new ol.source.Vector({
			                     features: (new ol.format.GeoJSON()).readFeatures(result.route)
			                 });
			                 var pathLayer = new ol.layer.Vector({
			                     source: routeSource,
			                     style: routeLayerStyle
			                 });
			                 map.addLayer(pathLayer);
			                 //添加分析出的引导点
			                 var guideSource = new ol.source.Vector({
			                     features: (new ol.format.GeoJSON()).readFeatures(result.pathGuideItems)
			                 });
			                 var guideLayer = new ol.layer.Vector({
			                     source: guideSource,
			                     style: guideLayerStyle
			                 });
			                 map.addLayer(guideLayer);
			             });
			         });
			     }
    }
}
</script>

<style scoped>
.c{
	position: absolute;
}
.Toolbar{
  right:-6%;
  top: 2.9%;
}
.DrawTool{
  width: 20%;
  right:5%;
  top: 10%;
}
.Search{
	right:5%;
	top:2%
}
.Compass{
	left:3%;
	top:3%
}
.Legend{
	right:2%;
	bottom:2%
}
.Computed{
	left:3%;
	top:3%
}
.Forecast{
	left:3%;
	top:3%
}
.ol-tooltip {
	position: relative;
	background: rgba(0, 0, 0, 0.5);
	border-radius: 4px;
	color: white;
	padding: 4px 8px;
	opacity: 0.7;
	white-space: nowrap;
	font-size: 12px;
  }
  .ol-tooltip-measure {
	opacity: 1;
	font-weight: bold;
  }
  .ol-tooltip-static {
	background-color: #ffcc33;
	color: black;
	border: 1px solid white;
  }
  .ol-tooltip-measure:before,
  .ol-tooltip-static:before {
	border-top: 6px solid rgba(0, 0, 0, 0.5);
	border-right: 6px solid transparent;
	border-left: 6px solid transparent;
	content: "";
	position: absolute;
	bottom: -6px;
	margin-left: -7px;
	left: 50%;
  }
  .ol-tooltip-static:before {
	border-top-color: #ffcc33;
  }
</style>