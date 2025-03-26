import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ApiResponse, AuditLog } from '../../../utils/interfaces';
import {
  auditOperation,
  auditTables,
} from '../../../utils/enums/auditlog.enum';
import { SendSetRole } from '../dtos/SendSetRole.dto';
import { roles } from 'src/utils/enums/roles.enum';

@Injectable()
export class AuthService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async register(data: {
    username: string;
    email: string;
    password: string;
    isAdmin?: boolean;
  }): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const createdUser = await this.firebaseService.createUser(
        data.email,
        data.password,
        data.username,
      );
      if (!createdUser.executed) throw new Error(createdUser.message);

      const currentDate = new Date();
      const userData = {
        id: createdUser.data.uid,
        username: data.username,
        email: data.email,
        role: data?.isAdmin == true ? 'ADMIN' : 'USER',
        is_admin: data?.isAdmin == true ? true : false,
        created_at: currentDate,
        updated_at: currentDate,
      };

      const savedUser = await this.firebaseService.setOrAddDocument(
        'users',
        userData,
        createdUser.data.uid,
      );
      if (!savedUser.executed) return createdUser;

      const auditLog: AuditLog = {
        changed_by: createdUser.data.uid,
        changed_data: userData,
        created_at: currentDate,
        updated_at: currentDate,
        operation: auditOperation.INSERT,
        record_id: createdUser.data.uid,
        table_name: auditTables.USERS,
      };
      await this.firebaseService.setOrAddDocument('audit_log', auditLog);

      const customToken = await this.firebaseService.createCustomToken(
        userData.id,
      );
      response.data = { ...userData, customToken };
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async createUser(data: { uid: string; name: string; email: string }) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const currentDate = new Date();
      const userData = {
        id: data.uid,
        username: data.name,
        email: data.email,
        role: 'USER',
        is_admin: false,
        created_at: currentDate,
        updated_at: currentDate,
      };

      const savedUser = await this.firebaseService.setOrAddDocument(
        'users',
        userData,
        data.uid,
      );
      if (!savedUser.executed) return savedUser;

      const auditLog: AuditLog = {
        changed_by: data.uid,
        changed_data: userData,
        created_at: currentDate,
        updated_at: currentDate,
        operation: auditOperation.INSERT,
        record_id: data.uid,
        table_name: auditTables.USERS,
      };
      await this.firebaseService.setOrAddDocument('audit_log', auditLog);

      response.data = userData;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async setRole(
    data: SendSetRole & { currentUser: any },
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const me = await this.firebaseService.getDocumentById(
        'users',
        data.currentUser.uid,
      );
      if (me?.data?.is_admin != true)
        throw new Error(
          `Currently you don't have 'ADMIN' role, can not set role`,
        );

      const userResponse = await this.firebaseService.getDocumentByProperty(
        'users',
        'email',
        data.email,
      );
      if (!userResponse.executed || !userResponse.data)
        throw new Error(userResponse.message);

      const user = userResponse.data;
      user.is_admin = data.role == roles.ADMIN ? true : false;
      user.role = data.role;

      const setUser = await this.firebaseService.setOrAddDocument(
        'users',
        user,
        user.id,
      );

      if (!setUser.executed) throw new Error(setUser.message);
      const currentDate = new Date();
      const auditLog: AuditLog = {
        changed_by: me.data.id,
        changed_data: { role: data.role, email: data.email },
        created_at: currentDate,
        updated_at: currentDate,
        operation: auditOperation.UPDATE,
        record_id: user.id,
        table_name: auditTables.USERS,
      };
      await this.firebaseService.setOrAddDocument('audit_log', auditLog);
      response.data = user;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getProfile(user) {
    const me = await this.firebaseService.getDocumentById('users', user.uid);
    return me;
  }
}
