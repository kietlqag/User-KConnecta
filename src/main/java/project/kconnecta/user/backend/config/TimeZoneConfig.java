package project.kconnecta.user.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

@Configuration
public class TimeZoneConfig {

    @Value("${APP_TIMEZONE:Asia/Ho_Chi_Minh}")
    private String appTimeZone;

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone(appTimeZone));
    }
}

