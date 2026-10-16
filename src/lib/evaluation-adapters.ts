export type VehicleLookup={brand:string;model:string;modelYear:number;source:string;chassis?:string;engineNumber?:string};
export type FipeLookup={value:number;source:string};
export type FipeCandidate={brand:string;model:string;modelYear:number;fipeCode:string;referenceMonth:string;fuel:string;value:number;similarity:number;correspondence:number};
export type CombinedPlateFipeLookup={vehicle:VehicleLookup;fipe:FipeLookup;alternatives:FipeCandidate[];warning?:string};

function endpoint(template:string,params:Record<string,string|number>){let url=template;for(const[key,value]of Object.entries(params))url=url.replaceAll(`{${key}}`,encodeURIComponent(String(value)));const parsed=new URL(url);if(!template.includes("{"))for(const[key,value]of Object.entries(params))parsed.searchParams.set(key,String(value));return parsed.toString();}
function sourceName(url:string){try{return new URL(url).hostname}catch{return"Fornecedor configurado"}}
function parseMoney(value:unknown){if(typeof value==="number")return Number.isFinite(value)?value:0;if(typeof value!=="string")return 0;const clean=value.replace(/R\$|\s/g,"");const normalized=clean.includes(",")?clean.replace(/\./g,"").replace(",","."):clean;const result=Number(normalized.replace(/[^0-9.-]/g,""));return Number.isFinite(result)?result:0;}
function optionalText(value:unknown){const text=String(value??"").trim();return text||undefined;}
async function request(url:string,token?:string){const response=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`,Accept:"application/json"}:{Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error(`Fornecedor respondeu ${response.status}.`);return response.json() as Promise<Record<string,unknown>>;}

export class PlacaFipeAdapter{
  constructor(private baseUrl:string,private token:string){}
  async lookup(plate:string):Promise<CombinedPlateFipeLookup>{
    const url=`${this.baseUrl.replace(/\/$/,"")}/getplacafipe`;
    const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({placa:plate,token:this.token}),cache:"no-store",signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Placa FIPE respondeu ${response.status}.`);
    const raw=await response.json() as Record<string,unknown>;
    const code=Number(raw.codigo??0);const message=String(raw.msg??"Falha na consulta Placa FIPE.");
    if(![1,22].includes(code))throw new Error(message);
    const info=(raw.informacoes_veiculo??{}) as Record<string,unknown>;
    const infoYear=Number(info.ano_modelo??info.ano??0);
    const candidates=(Array.isArray(raw.fipe)?raw.fipe:[]).map(item=>{
      const row=item as Record<string,unknown>;
      return{brand:String(row.marca??info.marca??"").trim(),model:String(row.modelo??info.modelo??"").trim(),modelYear:Number(row.ano_modelo??infoYear),fipeCode:String(row.codigo_fipe??""),referenceMonth:String(row.mes_referencia??""),fuel:String(row.combustivel??""),value:parseMoney(row.valor),similarity:Number(row.similaridade??0),correspondence:Number(row.correspondencia??0)};
    }).filter(item=>item.brand&&item.model&&item.modelYear>0&&item.value>0).sort((a,b)=>{
      const score=(item:FipeCandidate)=>(item.modelYear===infoYear?1000:0)+item.similarity+item.correspondence;
      return score(b)-score(a);
    });
    if(!candidates.length)throw new Error("A Placa FIPE não retornou uma correspondência com valor válido.");
    const chosen=candidates[0];
    return{vehicle:{brand:chosen.brand,model:chosen.model,modelYear:chosen.modelYear,source:"Placa FIPE",chassis:optionalText(info.chassi??info.chassis),engineNumber:optionalText(info.motor??info.engine_number??info.engineNumber)},fipe:{value:chosen.value,source:`Placa FIPE • ${chosen.referenceMonth||"referência atual"} • ${chosen.fipeCode||"sem código"}`},alternatives:candidates,warning:code===22?message:undefined};
  }
}

export interface PlateAdapter{lookup(plate:string):Promise<VehicleLookup>}
export interface FipeAdapter{lookup(vehicle:VehicleLookup,plate:string):Promise<FipeLookup>}

export class ConfiguredPlateAdapter implements PlateAdapter{
  constructor(private url:string,private token?:string){}
  async lookup(plate:string){const raw=await request(endpoint(this.url,{plate}),this.token);const data=(raw.data??raw.result??raw)as Record<string,unknown>;const brand=String(data.brand??data.marca??"").trim();const model=String(data.model??data.modelo??"").trim();const modelYear=Number(data.model_year??data.modelYear??data.anoModelo??data.year??data.ano??0);if(!brand||!model||!modelYear)throw new Error("A consulta de placa não retornou marca, modelo e ano.");return{brand,model,modelYear,source:sourceName(this.url),chassis:optionalText(data.chassis??data.chassi),engineNumber:optionalText(data.engine_number??data.engineNumber??data.motor)};}
}
export class ConfiguredFipeAdapter implements FipeAdapter{
  constructor(private url:string,private token?:string){}
  async lookup(vehicle:VehicleLookup,plate:string){const raw=await request(endpoint(this.url,{plate,brand:vehicle.brand,model:vehicle.model,year:vehicle.modelYear}),this.token);const data=(raw.data??raw.result??raw)as Record<string,unknown>;const value=parseMoney(data.value??data.valor??data.fipe_value??data.preco);if(value<=0)throw new Error("O fornecedor FIPE não retornou um valor válido.");return{value,source:sourceName(this.url)};}
}