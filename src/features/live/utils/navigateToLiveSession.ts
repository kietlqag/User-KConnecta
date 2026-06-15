import type { NavigateFunction } from 'react-router-dom';
import { liveService, type GoLiveResponse, type LiveSessionResponse } from '@/services/liveService';

export const LIVE_PRODUCER_STATE_KEY = 'kconnecta.liveProducerState';

export interface ProducerLocationState {
  postId?: string;
  sessionId?: string;
  roomName?: string;
  livekitUrl?: string | null;
  hostToken?: string | null;
  title?: string;
  description?: string;
  selectedCameraId?: string;
  selectedMicId?: string;
  videoSourceMode?: 'camera' | 'screen';
}

export function isSessionHost(session: LiveSessionResponse, userId?: string | null) {
  return Boolean(userId && session.hostUserId === userId);
}

export function isLiveSessionHost(session: LiveSessionResponse, userId?: string | null) {
  return isSessionHost(session, userId) && session.status === 'LIVE';
}

export function buildProducerStateFromGoLive(
  result: GoLiveResponse,
  extras?: Partial<ProducerLocationState>,
): ProducerLocationState {
  return {
    postId: result.session.postId ?? undefined,
    sessionId: result.session.id,
    roomName: result.session.roomName,
    livekitUrl: result.livekitUrl,
    hostToken: result.hostToken,
    title: result.session.title,
    description: result.session.description ?? '',
    ...extras,
  };
}

export async function buildProducerStateForHost(
  session: LiveSessionResponse,
  userId: string,
  extras?: Partial<ProducerLocationState>,
): Promise<ProducerLocationState> {
  const token = await liveService.getToken({ sessionId: session.id, userId, role: 'HOST' });
  return {
    postId: session.postId ?? undefined,
    sessionId: session.id,
    roomName: session.roomName,
    livekitUrl: token.livekitUrl,
    hostToken: token.token,
    title: session.title,
    description: session.description ?? '',
    ...extras,
  };
}

export function persistProducerState(state: ProducerLocationState) {
  window.sessionStorage.setItem(LIVE_PRODUCER_STATE_KEY, JSON.stringify(state));
}

export async function startScheduledLiveAndNavigate(
  session: LiveSessionResponse,
  navigate: NavigateFunction,
  extras?: Partial<ProducerLocationState>,
) {
  const result = await liveService.goLive(session.id);
  const producerState = buildProducerStateFromGoLive(result, extras);
  persistProducerState(producerState);
  navigate('/live/producer', { state: producerState });
}

export async function navigateToLiveSession(
  session: LiveSessionResponse,
  userId: string | undefined,
  navigate: NavigateFunction,
  options?: { asViewerPreview?: boolean },
) {
  if (!options?.asViewerPreview && isLiveSessionHost(session, userId) && userId) {
    const producerState = await buildProducerStateForHost(session, userId);
    persistProducerState(producerState);
    navigate('/live/producer', { state: producerState });
    return;
  }

  const previewQuery = options?.asViewerPreview ? '&preview=1' : '';
  navigate(`/live/viewer?sessionId=${encodeURIComponent(session.id)}${previewQuery}`);
}

export function getLiveViewerPreviewUrl(sessionId: string) {
  return `/live/viewer?sessionId=${encodeURIComponent(sessionId)}&preview=1`;
}
