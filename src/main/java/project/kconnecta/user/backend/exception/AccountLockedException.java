package project.kconnecta.user.backend.exception;

import lombok.Getter;
import project.kconnecta.user.backend.feature.auth.entity.Account;
import project.kconnecta.user.backend.feature.user.entity.User;

@Getter
public class AccountLockedException extends RuntimeException {

    private final User user;
    private final Account account;

    public AccountLockedException(User user, Account account) {
        super("Tài khoản của bạn đã bị khóa.");
        this.user = user;
        this.account = account;
    }
}
