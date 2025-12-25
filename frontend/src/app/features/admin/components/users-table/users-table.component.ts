import { Component, AfterViewInit, ViewChild, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { ChangeEmailDialogComponent } from '../dialogs/change-email-dialog/change-email-dialog.component';
import { SuccessDialogComponent } from '../dialogs/success-dialog/success-dialog.component';
import { ChangePasswordDialogComponent } from '../dialogs/change-password-dialog/change-password-dialog.component';
import { UserDialogComponent } from '../dialogs/user-dialog/user-dialog.component';
import { UserService } from 'src/app/core/services/api-service/users-table-service';
import { Observable } from 'rxjs';


export interface UserData {
  id: number;
  fio: string;
  role: string;
  access: string;
  email: string;
}

const USERS_DATA: UserData[] = [
  { id: 1, fio: 'Иванов Иван Иванович', role: 'Менеджер', access: 'Просмотр и редактирование', email: 'ivanov.ivan@yandex.ru' },
  { id: 2, fio: 'Одежда', role: 'Менеджер', access: 'Только просмотр', email: 'ivanov.ivan@yandex.ru' },
  { id: 3, fio: 'Иванов Иван Иванович', role: 'Клиент', access: 'Просмотр и редактирование', email: 'ivanov.ivan@yandex.ru' },
  { id: 4, fio: 'Иванов Иван Иванович', role: 'Товаровед', access: 'Просмотр и редактирование', email: 'ivanov.ivan@yandex.ru' },
];

@Component({
  selector: 'app-users-table',
  templateUrl: './users-table.component.html',
  styleUrls: ['./users-table.component.scss']
})
export class UsersTableComponent implements OnInit, AfterViewInit {
  roles$!: Observable<string[]>;
  accessLevels$!: Observable<string[]>;

  displayedColumns: string[] = ['select', 'fio', 'role', 'access', 'email', 'password'];
  dataSource = new MatTableDataSource<UserData>(USERS_DATA);
  selection = new SelectionModel<UserData>(true, []);
  totalUsersCount = 0;
  isBulkEditMode = false;
  private editCache = new Map<number, UserData>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(public dialog: MatDialog, public userService: UserService) {
    this.selection.changed.subscribe(() => {
      const isMultiSelect = this.selection.selected.length > 1;

      if (isMultiSelect && !this.isBulkEditMode) {
        this.isBulkEditMode = true;
        this.cacheOriginalValues();
      } else if (!isMultiSelect && this.isBulkEditMode) {
        this.cancelBulkEdit();
      }
    });
  }
  ngOnInit(): void {
    this.loadUsersPage(0, 5);

    // ЗАГРУЖАЕМ СПИСКИ ПРИ ИНИЦИАЛИЗАЦИИ
    this.roles$ = this.userService.getRoles();
    this.accessLevels$ = this.userService.getAccessLevels();
  }
  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this.loadUsersPage(this.paginator.pageIndex, this.paginator.pageSize);
    });
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsersPage(pageIndex: number, pageSize: number): void {
    this.userService.getUsersPage(pageIndex, pageSize).subscribe(response => {
      this.dataSource.data = response.users;
      this.totalUsersCount = response.totalCount;
      this.paginator.length = this.totalUsersCount;
    });
  }

  isAllSelected(): boolean {
    return this.selection.selected.length === this.dataSource.data.length && this.dataSource.data.length > 0;
  }

  masterToggle(): void {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    if (filterValue.length > 0) {
      this.userService.searchUsers(filterValue).subscribe({
        next: (results) => {
          this.dataSource.data = results;
        },
        error: (err) => {
          console.error('Ошибка при поиске пользователей', err);
        }
      });
    } else {
      // Когда поисковая строка пустая, можно загрузить полные данные или очистить фильтр
      this.loadAllUsers();
    }
  }

  loadAllUsers(): void {
    this.userService.getAllUsers().subscribe(users => {
      this.dataSource.data = users;
    });
  }

  private cacheOriginalValues(): void {
    this.editCache.clear();
    this.selection.selected.forEach(user => {
      this.editCache.set(user.id, { ...user });
    });
  }

  // saveBulkChanges(): void {
  //   console.log('Сохранение изменений:', this.selection.selected);
  //   // TODO: Отправить this.selection.selected на сервер
  //   this.isBulkEditMode = false;
  //   this.selection.clear();
  //   this.editCache.clear();
  // }

  saveBulkChanges(): void {
    const changedRows = this.selection.selected.map(item =>
      this.editCache.get(item.id) ?? item
    );
    if (changedRows.length === 0) return;

    this.userService.bulkUpdateUsers(changedRows).subscribe({
      next: (updatedUsers) => {
        const data = [...this.dataSource.data];
        updatedUsers.forEach(updatedUser => {
          const idx = data.findIndex(d => d.id === updatedUser.id);
          if (idx !== -1) data[idx] = updatedUser;
        });
        this.dataSource.data = data;
        this.isBulkEditMode = false;
        this.selection.clear();
        this.editCache.clear();
        console.log('Пользователи успешно обновлены');
      },
      error: (error) => {
        console.error('Ошибка при сохранении изменений пользователей', error);
      }
    });
  }

  cancelBulkEdit(): void {
    this.dataSource.data.forEach((user, index) => {
      if (this.editCache.has(user.id)) {
        this.dataSource.data[index] = this.editCache.get(user.id)!;
      }
    });
    this.dataSource.data = [...this.dataSource.data];
    this.isBulkEditMode = false;
    this.selection.clear();
    this.editCache.clear();
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '500px', data: { user: null }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newId = Math.max(0, ...this.dataSource.data.map(u => u.id)) + 1;
        this.dataSource.data = [...this.dataSource.data, { ...result, id: newId }];
        this.userService.addUser(result).subscribe({
          next: (newUser) => {
            // Обновляем таблицу после добавления
            this.dataSource.data = [...this.dataSource.data, newUser];
            console.log('Пользователь добавлен', newUser);
          },
          error: (error) => {
            console.error('Ошибка при добавлении пользователя', error);
          }
        });
      }
    });
  }

  // openEditDialog(): void {
  //   if (this.selection.selected.length !== 1) return;
  //   const dialogRef = this.dialog.open(UserDialogComponent, {
  //     width: '500px', data: { user: this.selection.selected[0] }
  //   });
  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result) {
  //       const index = this.dataSource.data.findIndex(u => u.id === result.id);
  //       if (index > -1) {
  //         const data = [...this.dataSource.data];
  //         data[index] = { ...data[index], ...result };
  //         this.dataSource.data = data;
  //       }
  //     }
  //   });
  // }
  openEditDialog(): void {
    if (this.selection.selected.length !== 1) return;
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '500px',
      data: { user: this.selection.selected[0] }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.userService.updateUser(result.id, result).subscribe({
          next: (updatedUser) => {
            const index = this.dataSource.data.findIndex(u => u.id === updatedUser.id);
            if (index !== -1) {
              const data = [...this.dataSource.data];
              data[index] = updatedUser;
              this.dataSource.data = data;
            }
            this.selection.clear();
            console.log('Пользователь успешно обновлен');
          },
          error: (error) => {
            console.error('Ошибка обновления пользователя', error);
          }
        });
      }
    });
  }

  deleteSelected(): void {
    const selectedIds = this.selection.selected.map(u => u.id);
    if (selectedIds.length === 0) return;

    // Подтверждение и удаление
    this.userService.deleteUsers(selectedIds).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(u => !selectedIds.includes(u.id));
        this.selection.clear();
        console.log('Пользователи успешно удалены');
      },
      error: err => {
        console.error('Ошибка удаления пользователей', err);
      }
    });
  }

  // deleteSelected(): void {
  //   const idsToDelete = new Set(this.selection.selected.map(u => u.id));
  //   this.dataSource.data = this.dataSource.data.filter(u => !idsToDelete.has(u.id));
  //   this.selection.clear();
  // }

  // openChangeEmailDialog(element: UserData): void {
  //   const dialogRef = this.dialog.open(ChangeEmailDialogComponent, {
  //     width: '400px', data: { email: element.email }
  //   });
  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result?.newEmail) {
  //       element.email = result.newEmail;
  //       this.dialog.open(SuccessDialogComponent, {
  //         width: '400px', data: { title: 'E-mail успешно изменен', message: `Новый E-mail для входа: ${result.newEmail}` }
  //       });
  //     }
  //   });
  // }

  // openChangePasswordDialog(): void {
  //   const dialogRef = this.dialog.open(ChangePasswordDialogComponent, { width: '400px' });
  //   dialogRef.afterClosed().subscribe(ok => {
  //     if (ok) {
  //       this.dialog.open(SuccessDialogComponent, {
  //         width: '400px', data: { title: 'Пароль успешно изменен', message: 'Вы можете использовать новый пароль для входа.' }
  //       });
  //     }
  //   });
  // }
  openChangeEmailDialog(element: UserData): void {
    const dialogRef = this.dialog.open(ChangeEmailDialogComponent, {
      width: '400px', data: { email: element.email }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.newEmail) {
        this.userService.changeUserEmail(element.id, result.newEmail).subscribe({
          next: () => {
            element.email = result.newEmail;
            this.dialog.open(SuccessDialogComponent, {
              width: '400px', data: { title: 'E-mail успешно изменен', message: `Новый E-mail для входа: ${result.newEmail}` }
            });
          },
          error: err => {
            console.error('Ошибка при изменении email', err);
          }
        });
      }
    });
  }


  openChangePasswordDialog(): void {
    const dialogRef = this.dialog.open(ChangePasswordDialogComponent, { width: '400px' });
    dialogRef.afterClosed().subscribe(newPassword => {
      if (newPassword) {
        // Предполагаем, что есть selected пользователь
        const userId = this.selection.selected.length === 1 ? this.selection.selected[0].id : null;
        if (userId) {
          this.userService.changeUserPassword(userId, newPassword).subscribe({
            next: () => {
              this.dialog.open(SuccessDialogComponent, {
                width: '400px',
                data: { title: 'Пароль успешно изменен', message: 'Вы можете использовать новый пароль для входа.' }
              });
            },
            error: err => {
              console.error('Ошибка при изменении пароля', err);
            }
          });
        }
      }
    });
  }

}