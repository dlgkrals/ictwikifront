import apiClient, { API_BASE_URL } from './client';

const MAX_WIDTH = 1920;

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, type: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('이미지 인코딩에 실패했습니다.')); return; }
        resolve(new File([blob], name, { type }));
      },
      type,
      type === 'image/jpeg' ? 0.88 : undefined,
    );
  });
}

/** HEIC 디코딩 → Canvas 그리기 (리사이징 포함) */
async function convertHeic(file: File): Promise<File> {
  const libheif = (await import('libheif-js')).default;
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(arrayBuffer));

  if (!images || images.length === 0) {
    throw new Error('HEIC 파일을 읽을 수 없습니다.');
  }

  const image = images[0];
  const srcWidth: number = image.get_width();
  const srcHeight: number = image.get_height();

  // 리사이징 계산
  const scale = srcWidth > MAX_WIDTH ? MAX_WIDTH / srcWidth : 1;
  const dstWidth = Math.round(srcWidth * scale);
  const dstHeight = Math.round(srcHeight * scale);

  // libheif로 RGBA 픽셀 디코딩
  const pixelData = await new Promise<Uint8ClampedArray>((resolve, reject) => {
    image.display(
      { data: new Uint8ClampedArray(srcWidth * srcHeight * 4), width: srcWidth, height: srcHeight },
      (result: { data: Uint8ClampedArray } | null) => {
        if (!result) { reject(new Error('HEIC 디코딩에 실패했습니다.')); return; }
        resolve(result.data);
      },
    );
  });

  // 원본 크기 Canvas에 그린 뒤 리사이징 Canvas로 복사
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  srcCanvas.getContext('2d')!.putImageData(new ImageData(pixelData, srcWidth, srcHeight), 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstWidth;
  dstCanvas.height = dstHeight;
  dstCanvas.getContext('2d')!.drawImage(srcCanvas, 0, 0, dstWidth, dstHeight);

  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return canvasToFile(dstCanvas, newName, 'image/jpeg');
}

/** 일반 이미지 리사이징 (가로 1920 초과 시) */
function resizeIfNeeded(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (file.type === 'image/gif') { resolve(file); return; }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= MAX_WIDTH) { resolve(file); return; }

      const ratio = MAX_WIDTH / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = MAX_WIDTH;
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvasToFile(canvas, file.name, outputType).then(resolve).catch(() => resolve(file));
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export const fileApi = {
  upload: async (file: File): Promise<string> => {
    let processed: File;

    if (isHeic(file)) {
      // HEIC: 변환 + 리사이징 한 번에
      processed = await convertHeic(file);
    } else {
      // 일반 이미지: 리사이징만
      processed = await resizeIfNeeded(file);
    }

    const formData = new FormData();
    formData.append('file', processed);
    const response = await apiClient.post<{ url: string }>('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return API_BASE_URL + response.data.url;
  },
};
