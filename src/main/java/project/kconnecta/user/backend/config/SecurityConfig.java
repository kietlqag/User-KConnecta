package project.kconnecta.user.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.CrossOriginOpenerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import project.kconnecta.user.backend.config.security.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(ct -> {})
                        .referrerPolicy(ref -> ref
                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        // CSP cho API: API chỉ trả JSON, không cần tải tài nguyên ngoài nào.
                        // Khóa chặt theo khuyến nghị OWASP cho REST API → defense-in-depth.
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'none'; " +      // mặc định: không cho tải gì
                                "frame-ancestors 'none'; " +   // không cho nhúng vào iframe (chống clickjacking)
                                "base-uri 'none'; " +          // chặn <base> bị tiêm để đổi gốc URL
                                "form-action 'none'"))         // không cho submit form đi đâu
                        // Tắt mặc định các API nhạy cảm của trình duyệt (camera/mic/định vị/thanh toán).
                        .permissionsPolicyHeader(permissions -> permissions
                                .policy("camera=(), microphone=(), geolocation=(), payment=()"))
                        // Cô lập ngữ cảnh duyệt → giảm rủi ro tấn công xuyên cửa sổ (XS-Leaks).
                        .crossOriginOpenerPolicy(coop -> coop
                                .policy(CrossOriginOpenerPolicyHeaderWriter.CrossOriginOpenerPolicy.SAME_ORIGIN))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/set-password").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/search/suggest").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/policies/public").permitAll()
                        .requestMatchers("/api/auth/**", "/api/internal/**", "/ws/**", "/*.html", "/**.html").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
