class MyMap{
	constructor() {
	  this.map = new ol.Map({
	          target: 'map',
	          controls: ol.control.defaults({attributionOptions: {collapsed: false}})
	              .extend([new ol.supermap.control.Logo()]),
	          view: new ol.View({
	              center: [116.46195256912856, 39.80105097717985],
	              zoom: 10,
	              projection: "EPSG:4326",
	              multiWorld: true
	          }),
	          
	          layers: [new ol.layer.Tile({
	              source: new ol.source.Tianditu({
	                  layerType: 'ter',
	                  key: "1d109683f4d84198e37a38c442d68311",
	                  projection: "EPSG:4326"
	              })
	          }), new ol.layer.Tile({
	              source: new ol.source.Tianditu({
	                  layerType: 'ter',
	                  key: "1d109683f4d84198e37a38c442d68311",
	                  isLabel: true,
	                  projection: "EPSG:4326"
	              })
	          })]
	      });
		  
		  
		  this.drawSource = new ol.source.Vector();
		  this.drawLayer = new ol.layer.Vector({
		  name:'drawLayer',
		  source: this.drawSource,
		  
		  });
		 this. map.addLayer(this.drawLayer);
		  
		  // 注册事件
		   this.map.on('singleclick',e=>{
			   console.log(e.coordinate)
			   this.addCircle({
				   center:e.coordinate,
				   radius:0.1,
			   })
		   })
	}
	addCircle(e){
	   var iconFeature = new ol.Feature({
	      geometry:new ol.geom.Circle(e.center,e.radius),
	   			type:'circle'
	    });
	   var iconStyle = new ol.style.Style({
	      fill: new ol.style.Fill({
	        color: 'rgb(12,124,210,0.4)'
	      }),
		stroke: new ol.style.Stroke({
						 color: 'rgba(0, 0, 0, 0.5)',
						 lineDash: [10, 10],
						 width: 2
		}),
		});
	    
	    iconFeature.setStyle(iconStyle);
	    this.drawSource.addFeature(iconFeature)
	}
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
	}
	
	// 获取地图中心
	getCenter(){
			let mapExtent = this.map.getView().calculateExtent(this.map.getSize())
			 return ol.extent.getCenter(mapExtent)
	}
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
	
}

let m=new MyMap('map');
