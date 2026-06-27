package project.kconnecta.user.backend.feature.auth.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import project.kconnecta.user.backend.config.security.AuthCookieService;
import project.kconnecta.user.backend.config.security.RateLimitService;
import project.kconnecta.user.backend.exception.GlobalExceptionHandler;
import project.kconnecta.user.backend.exception.InvalidRefreshTokenException;
import project.kconnecta.user.backend.feature.auth.dto.response.AuthResponse;
import project.kconnecta.user.backend.feature.auth.service.AuthService;
import project.kconnecta.user.backend.feature.auth.service.OtpService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthRefreshControllerTest {

    private final AuthService authService = mock(AuthService.class);
    private final OtpService otpService = mock(OtpService.class);
    private final RateLimitService rateLimitService = mock(RateLimitService.class);
    private final AuthCookieService authCookieService = mock(AuthCookieService.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController(otpService, authService, rateLimitService, authCookieService);
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        when(rateLimitService.isRateLimited(eq("refresh"), anyString(), anyInt(), any())).thenReturn(false);
    }

    @Test
    void refresh_valid_setsCookiesAndOmitsTokensFromBody() throws Exception {
        when(authService.refresh("good"))
                .thenReturn(AuthResponse.builder().token("newAccess").refreshToken("newRefresh").build());

        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"good\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    @Test
    void refresh_invalidToken_returns401() throws Exception {
        when(authService.refresh("bad")).thenThrow(new InvalidRefreshTokenException("het han"));

        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"bad\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_missingToken_returns401() throws Exception {
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
