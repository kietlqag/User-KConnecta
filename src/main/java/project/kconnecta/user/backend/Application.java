package project.kconnecta.user.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;
import org.springframework.scheduling.annotation.EnableScheduling;

import project.kconnecta.user.backend.config.StoryPrivacySchemaBootstrap;

@EnableCaching
@EnableScheduling
@SpringBootApplication(exclude = RedisAutoConfiguration.class)
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class Application {

	public static void main(String[] args) {
		java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
		StoryPrivacySchemaBootstrap.migrateBeforeStartup();
		SpringApplication.run(Application.class, args);
	}

}
