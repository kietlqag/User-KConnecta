package project.kconnecta.user.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;
import org.springframework.scheduling.annotation.EnableScheduling;

import project.kconnecta.user.backend.config.StoryPrivacySchemaBootstrap;

@EnableCaching
@EnableScheduling
@SpringBootApplication
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class Application {

	public static void main(String[] args) {
		StoryPrivacySchemaBootstrap.migrateBeforeStartup();
		SpringApplication.run(Application.class, args);
	}

}
