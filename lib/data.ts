export type Supplier={id:string;name:string;product:string;price:number;availability:number;delivery:string;reliability:number;rating:number;location:string;source:string;why:string;communication:boolean};
export const suppliers:Supplier[]=[
 {id:'sahara',name:'Sahara Workspace',product:'Ergonomic task chair',price:750,availability:600,delivery:'5 days',reliability:91,rating:4.6,location:'Bengaluru',source:'Marketplace X',why:'Strong fulfilment history',communication:false},
 {id:'cobalt',name:'Cobalt Office Systems',product:'Ergonomic task chair',price:740,availability:500,delivery:'4 days',reliability:98,rating:4.9,location:'Chennai',source:'ONDC',why:'Best overall match',communication:true},
 {id:'ernest',name:'Ernest Furnishings',product:'Ergonomic task chair',price:735,availability:800,delivery:'5 days',reliability:93,rating:4.7,location:'Coimbatore',source:'ONDC',why:'Lowest unit price',communication:true},
 {id:'dwell',name:'Dwell Business',product:'Ergonomic task chair',price:748,availability:520,delivery:'6 days',reliability:95,rating:4.8,location:'Chennai',source:'Direct API',why:'Excellent quality record',communication:true},
 {id:'aura',name:'Aura Commercial',product:'Ergonomic task chair',price:760,availability:1000,delivery:'4 days',reliability:89,rating:4.4,location:'Hyderabad',source:'Marketplace X',why:'Fastest fulfilment',communication:false}
];
export const nav=[['LayoutDashboard','Dashboard','/dashboard'],['Search','Procure','/procure'],['Building2','Suppliers','/suppliers'],['MessagesSquare','Negotiations','/negotiations'],['FileText','Purchase Orders','/purchase-orders'],['Truck','Shipments','/shipments'],['FolderOpen','Documents','/documents'],['ChartNoAxesCombined','Analytics','/analytics']];
