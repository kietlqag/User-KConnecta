import axios from 'axios';

export interface Province {
  code: string;
  name: string;
}

export interface Ward {
  code: string;
  name: string;
}

interface CasProvinceResponse {
  provinces: Province[];
}

interface CasCommunesResponse {
  communes: Ward[];
}

const locationAxios = axios.create({
  baseURL: `https://production.cas.so/address-kit/2025-07-01`,
});

export const locationService = {
  async getProvinces(): Promise<Province[]> {
    const { data } = await locationAxios.get<CasProvinceResponse>('/provinces');
    const provinces = data.provinces ?? [];
    return provinces.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  },

  async getWardsByProvinceCode(provinceCode: string): Promise<Ward[]> {
    const { data } = await locationAxios.get<CasCommunesResponse>(`/provinces/${provinceCode}/communes`);
    const wards = (data.communes ?? []).filter(
      (ward) => ward.name && ward.name.trim().length > 1 && ward.name.trim() !== '.',
    );
    return wards.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  },
};
