package project.kconnecta.user.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
public class DbConnectionTestRunner implements CommandLineRunner {

    private final DataSource dataSource;

    public DbConnectionTestRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            System.out.println("DB connected successfully!");
            System.out.println("URL: " + connection.getMetaData().getURL());
            System.out.println("User: " + connection.getMetaData().getUserName());
        } catch (Exception e) {
            System.out.println("DB connection failed!");
            e.printStackTrace();
        }
    }
}