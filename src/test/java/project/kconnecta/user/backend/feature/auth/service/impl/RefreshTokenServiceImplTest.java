package project.kconnecta.user.backend.feature.auth.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import project.kconnecta.user.backend.exception.InvalidRefreshTokenException;
import project.kconnecta.user.backend.exception.RefreshTokenReuseException;
import project.kconnecta.user.backend.feature.auth.service.RefreshTokenService;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceImplTest {

    @Mock StringRedisTemplate redis;
    @Mock ValueOperations<String, String> valueOps;
    @Mock SetOperations<String, String> setOps;

    private RefreshTokenServiceImpl service;

    @BeforeEach
    void setUp() {
        lenient().when(redis.opsForValue()).thenReturn(valueOps);
        lenient().when(redis.opsForSet()).thenReturn(setOps);
        service = new RefreshTokenServiceImpl(redis);
    }

    @Test
    void issue_thenRotate_happyPath() {
        UUID userId = UUID.randomUUID();
        UUID sid = UUID.randomUUID();

        ArgumentCaptor<String> keyCap = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> valCap = ArgumentCaptor.forClass(String.class);
        String token = service.issue(userId, sid);
        verify(valueOps).set(keyCap.capture(), valCap.capture(), any(Duration.class));
        assertThat(keyCap.getValue()).isEqualTo("refresh:" + sid);

        when(valueOps.get("refresh:" + sid)).thenReturn(valCap.getValue());
        RefreshTokenService.RotationResult result = service.rotate(token);

        assertThat(result.userId()).isEqualTo(userId);
        assertThat(result.sid()).isEqualTo(sid);
        assertThat(result.newRefreshToken()).isNotBlank().isNotEqualTo(token);
    }

    @Test
    void rotate_unknownToken_throwsInvalid() {
        UUID sid = UUID.randomUUID();
        String token = service.issue(UUID.randomUUID(), sid);
        when(valueOps.get("refresh:" + sid)).thenReturn(null);
        assertThatThrownBy(() -> service.rotate(token))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void rotate_reusedToken_throwsReuse_andRevokes() {
        UUID userId = UUID.randomUUID();
        UUID sid = UUID.randomUUID();
        String oldToken = service.issue(userId, sid);
        when(valueOps.get("refresh:" + sid)).thenReturn(userId + ":" + "deadbeefhash");
        assertThatThrownBy(() -> service.rotate(oldToken))
                .isInstanceOf(RefreshTokenReuseException.class);
        verify(redis).delete("refresh:" + sid);
    }

    @Test
    void rotate_malformedToken_throwsInvalid() {
        assertThatThrownBy(() -> service.rotate("khong-co-dau-cham"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void revoke_deletesKey() {
        UUID sid = UUID.randomUUID();
        service.revoke(sid);
        verify(redis).delete("refresh:" + sid);
    }
}
