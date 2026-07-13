import axios from 'axios';

export interface Province {
  code: string;
  name: string;
}

export interface Ward {
  code: string;
  name: string;
}

interface OpenApiProvince {
  code: number;
  name: string;
}

interface OpenApiWard {
  code: number;
  name: string;
}

interface OpenApiDistrict {
  wards: OpenApiWard[];
}

interface OpenApiProvinceDetail {
  districts: OpenApiDistrict[];
}

const locationAxios = axios.create({
  baseURL: `https://provinces.open-api.vn/api`,
});

export const locationService = {
  async getProvinces(): Promise<Province[]> {
    const { data } = await locationAxios.get<OpenApiProvince[]>('/');
    const provinces = (data ?? []).map(p => ({
      code: String(p.code),
      name: p.name,
    }));
    return provinces.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  },

  async getWardsByProvinceCode(provinceCode: string): Promise<Ward[]> {
    const { data } = await locationAxios.get<OpenApiProvinceDetail>(`/p/${provinceCode}?depth=3`);
    const districts = data.districts ?? [];
    const wards: Ward[] = districts
      .flatMap(d => d.wards ?? [])
      .filter(w => w.name && w.name.trim().length > 1 && w.name.trim() !== '.')
      .map(w => ({
        code: String(w.code),
        name: w.name,
      }));
    return wards.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  },
};
