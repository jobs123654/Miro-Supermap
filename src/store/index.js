import Vue from 'vue';
import Vuex from 'vuex';
Vue.use(Vuex);
const state={//要设置的全局访问的state对象
    secondMenu:null,
    info:null,
    mapVisible:true,
    dataVisible:false,
		progressValue:0,
		formObj:null,
		dataObj:null,
		key:'rad',
		key1:'mes',
		data:new Array(),
		data1:new Array(),
		result:[],
		importVisible:false,
		users:[
			{
				ID:1,
				账号:'root',
				密码:'root',
				角色:'超级管理员',
				登录:false,
				电话:'15323456789',
			},
			{
				ID:2,
				账号:'aaa',
				密码:'aaa',
					登录:false,
				角色:'数据维护人员',
				电话:'15323456789',
			},
			
			
			]
  };
const getters = {   //实时监听state值的变化(最新状态)
  isShow(state) {  //方法名随意,主要是来承载变化的showFooter的值
      return ''
  },
  getChangedNum(){  //方法名随意,主要是用来承载变化的changableNum的值
      return ''
  }
};
const mutations = {
  setSecondMenu(state,item){
    state.secondMenu=item;
  },
  setProgressValue(state,item){
    state.progressValue=item;
  },
  /* ************************/
  setData(state,item){
	if(state.data&&state.data.length>0){
		item.forEach(e=>{
			state.data.push(e)
		})
	}else{
		state.data=item
	}
    
	localStorage.setItem(state.key,JSON.stringify(state.data))
  },
  pushData(state,item){
	  if(!state.data){
		  state.data=new Array();
	  }
	  item['yid']=item.年份;
	  delete item.年份;
	  state.data.push(item)
	  localStorage.setItem(state.key,JSON.stringify(state.data))
	  
  },
  editDataItem(state,item){
	  let index=state.data.findIndex(e=>e['时间(世界时)']==item['时间(世界时)'])
	  if (index>-1) {
		  item['yid']=item.年份;
		   delete item.年份;
		   delete item.ID;
	  		 for(let i in item){
	  			 Vue.set(state.data[index], i,item[i] )
	  		 }
	  }
	 delete state.data[index].年份
	localStorage.setItem(state.key,JSON.stringify(state.data))
  },
  delDataItem(state,item){
	  let i=state.data.findIndex(e=>e.ID===item.ID)
	  state.data.splice(i,1)
	  localStorage.setItem(state.key,JSON.stringify(state.data))
  },
  setData1(state,item){
    state.data1=item;
  	localStorage.setItem(state.key1,JSON.stringify(state.data1))
  },
  pushData1(state,item){
	 let index=state.data1[state.data1.length-1].ID
	 item.ID=index+1;
  	  state.data1.push(item)
  	  localStorage.setItem(state.key1,JSON.stringify(state.data1))
  },
  editDataItem1(state,item){
  	  let index=state.data1.findIndex(e=>e.ID==item.ID)
  	
  	  if (index>-1) {
  	  		 for(let i in item){
  	  			 Vue.set(state.data1[index], i,item[i] )
  	  		 }
  	  }
  	localStorage.setItem(state.key1,JSON.stringify(state.data1))
  },
  delDataItem1(state,item){
  	  let i=state.data1.findIndex(e=>e.ID===item.ID)
  	  state.data1.splice(i,1)
  	  localStorage.setItem(state.key1,JSON.stringify(state.data1))
  },
  /* ***************************/
  setInfo(state,item){
    state.info=item;
  },
  setResult(state,item){
    state.result=item;
  },
  putResult(state,item){
    state.result.push(item);
  },
  showMap(state){
    state.mapVisible=true
    state.dataVisible=false
  },
  showData(state){
    state.mapVisible=false
    state.dataVisible=true
  },
  setImport(state,item){
	  state.importVisible=item
  },
	setForm(state,item){
	  state.formObj=item
	},
	setDataObj(state,item){
	  state.dataObj=item
	},
	setUsers(state,item){
	  state.users=item
	},
	editUsers(state,item){
	  let index=state.users.findIndex(e=>e.ID==item.ID)
	
	  if (index>-1) {
		  
		 for(let i in item){
			 // state.users[index][i]=item[i]
			 Vue.set(state.users[index], i,item[i] )
			
		 }
	  }
	},
	putUsers(state,item){
	 item.ID=state.users[state.users.length-1].ID+1;
	  state.users.push(item)
	},
	delUser(state,u){
		let i=state.users.findIndex(e=>e.账号===u.账号)
		state.users.splice(i,1)
		
	}
};
const actions = {
  hideFooter(context) {  //自定义触发mutations里函数的方法，context与store 实例具有相同方法和属性
      context.commit('hide');
  },
  showFooter(context) {  //同上注释
      context.commit('show');
  },
  getNewNum(context,num){   //同上注释，num为要变化的形参
      context.commit('newNum',num)
   }
};
const store = new Vuex.Store({
      state,
      getters,
      mutations,
      actions,
   });

export default store;