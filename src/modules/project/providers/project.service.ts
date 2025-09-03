import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { SendAddItem } from '../dto/SendAddItem.dto';
import { ApiResponse } from 'src/utils/interfaces';
import { documents } from 'src/utils/enums/documents.enum';
import { SendCreateProject } from '../dto/SendCreateProject.dto';
import { SendAddSharedProject } from '../dto/SendAddSharedProject';

@Injectable()
export class ProjectService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async createProject(
    data: SendCreateProject,
    userId: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();
      const currentDate = new Date();

      const collectionRef = firestore.collection(documents.project);
      const docRef = collectionRef.doc();

      const _public = data?.public == true ? true : false;
      const dataWithId = {
        ...data,
        public: _public,
        name_lower: data.name.toLowerCase(),
        user_id: userId,
        created_at: currentDate,
        updated_at: currentDate,
        id: docRef.id,
      };

      await docRef.set(dataWithId);

      response.data = dataWithId;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: SendCreateProject,
  ) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();
      const queryProject = await firestore
        .collection(documents.project)
        .doc(projectId)
        .get();

      if (!queryProject.exists) throw new Error(`Project not found`);
      if (queryProject.data().user_id != userId)
        throw new Error(`User can not update this project`);

      const project = queryProject.data();
      const currentDate = new Date();
      const name_lower = project?.name ? project.name.toLowerCase() : undefined;
      const _public =
        data.public != undefined && project.public != data.public
          ? data.public
          : project.public;

      const body = {
        ...data,
        updated_at: currentDate,
        name_lower,
        public: _public,
      };
      await this.firebaseService.setOrAddDocument(
        documents.project,
        body,
        projectId,
      );
      response.data = {
        ...body,
        id: projectId,
        user_id: userId,
        created_at: project.created_at.toDate(),
      };
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getMyProjects(
    userId: string,
    filters: {
      name?: string;
    },
    limit: number,
    page: number = 1,
  ) {
    const firestore = this.firebaseService.returnFirestore();
    let query = firestore
      .collection(documents.project)
      .where('user_id', '==', userId);

    if (filters.name !== undefined) {
      const nameFilter = filters.name.toLowerCase();
      query = query
        .where('name_lower', '>=', nameFilter)
        .where('name_lower', '<=', nameFilter + '\uf8ff');
    }

    const totalSnapshot = await query.get();

    const totalProjects = totalSnapshot.size;
    const totalPages = Math.ceil(totalProjects / limit);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (currentPage - 1) * limit;
    let startAfterDoc = null;

    if (startIndex > 0 && startIndex < totalSnapshot.docs.length) {
      startAfterDoc = totalSnapshot.docs[startIndex - 1];
    }

    if (startAfterDoc) {
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.limit(limit).get();
    const projects = snapshot.docs.map((doc) => {
      const _data = doc.data();
      return {
        id: doc.id,
        ..._data,
        created_at: new Date(_data?.created_at._seconds * 1000),
        updated_at: new Date(_data?.updated_at._seconds * 1000),
      };
    });

    const getItems = async (project) => {
      const queryProjectItems = await firestore
        .collection(documents.project_item)
        .where('project_id', '==', project.id)
        .get();
      project.items = queryProjectItems.docs.map((item) => {
        return {
          id: project.id,
          ...item.data(),
          created_at: new Date(item.data().created_at._seconds * 1000),
          updated_at: new Date(item.data().updated_at._seconds * 1000),
        };
      });
    };

    await Promise.all(projects.map(getItems));

    return {
      currentPage,
      totalProjects,
      totalPages,
      limit,
      projects,
    };
  }

  async addItem(data: SendAddItem & { user_id: string }) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();
      const queryProject = await firestore
        .collection(documents.project)
        .doc(data.project_id)
        .get();
      const project = queryProject.data();

      // Validations
      if (!queryProject.exists) throw new Error(`Project not found`);
      if (project.user_id != data.user_id)
        throw new Error(`Only owner can update the project.`);

      const queryProjectItem = await firestore
        .collection(documents.project_item)
        .where('project_id', '==', data.project_id)
        .where('table', '==', data.table)
        .where('table_id', '==', data.table_id)
        .limit(1)
        .get();

      if (!queryProjectItem.empty) {
        const _projectItem = queryProjectItem.docs[0];
        response.data = { id: _projectItem.id, ..._projectItem.data() };
        return;
      }
      await this.validateTableCases(data);
      // Validations

      const collectionRef = firestore.collection(documents.project_item);
      const docRef = collectionRef.doc();
      const currentDate = new Date();
      const dataWithId = {
        ...data,
        created_at: currentDate,
        updated_at: currentDate,
        id: docRef.id,
      };

      await docRef.set(dataWithId);
      response.data = dataWithId;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async validateTableCases(data: SendAddItem): Promise<void> {
    const firestore = this.firebaseService.returnFirestore();
    if (data.table == 'paints') {
      if (!data.brand_id)
        throw new Error(`To add a paint 'brand_id' is required.`);
      const queryPaint = await firestore
        .doc(`brands/${data.brand_id}/paints/${data.table_id}`)
        .get();
      if (!queryPaint.exists)
        throw new Error(
          `Paint '${data.table_id}' was not found in Brand: '${data.brand_id}'`,
        );
    } else if (data.table == 'palettes') {
      const queryPalette = await firestore
        .doc(`palettes/${data.table_id}`)
        .get();
      if (!queryPalette.exists)
        throw new Error(`Palette '${data.table_id}' was not found`);
    } else if (data.table == 'user_color_images') {
      const queryImages = await firestore
        .doc(`user_color_images/${data.table_id}`)
        .get();
      if (!queryImages.exists)
        throw new Error(`Image '${data.table_id}' was not found`);
    } else throw new Error(`Table '${data.table}' not available`);
  }

  async removeItem(projectItemId: string, userId: string) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();
      const queryProjectItem = await firestore
        .collection(documents.project_item)
        .doc(projectItemId)
        .get();

      if (!queryProjectItem.exists)
        throw new Error(`Project item ${projectItemId} was not found`);

      const _data = queryProjectItem.data();
      console.log('_data', _data);
      console.log('_data.userId', _data.userId, 'userId', userId);
      if (_data.user_id != userId)
        throw new Error(`Only owner can update the project.`);

      await this.firebaseService.deleteDocument(
        documents.project_item,
        projectItemId,
      );
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async deleteProject(projectId: string, userId: string) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();
      const queryProject = await firestore
        .collection(documents.project)
        .doc(projectId)
        .get();

      if (!queryProject.exists)
        throw new Error(`Project ${projectId} was not found`);
      if (queryProject.data().user_id != userId)
        throw new Error(`User can not delete this project`);

      const queryProjectItems = await firestore
        .collection(documents.project_item)
        .where('project_id', '==', projectId)
        .get();

      const deleteItem = async (item) => {
        await this.firebaseService.deleteDocument(
          documents.project_item,
          item.id,
        );
      };
      await Promise.all(queryProjectItems.docs.map(deleteItem));

      await this.firebaseService.deleteDocument(documents.project, projectId);
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async addSharedProject(
    data: SendAddSharedProject & { user_triggered_action: string },
  ) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();

      const queryGetProjectShared = await firestore
        .collection(documents.project_shared)
        .where('project_id', '==', data.project_id)
        .where('user_id', '==', data.user_id)
        .limit(1)
        .get();

      if (queryGetProjectShared.docs.length > 0) {
        response.message =
          'The project already has a previously shared record.';
      } else {
        const collectionRef = firestore.collection(documents.project_shared);
        const docRef = collectionRef.doc();
        const currentDate = new Date();
        const dataWithId = {
          ...data,
          created_at: currentDate,
          updated_at: currentDate,
          id: docRef.id,
        };

        await docRef.set(dataWithId);
      }
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async removeSharedProject(data: SendAddSharedProject) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();

      const queryGetProjectShared = await firestore
        .collection(documents.project_shared)
        .where('project_id', '==', data.project_id)
        .where('user_id', '==', data.user_id)
        .limit(1)
        .get();
      if (queryGetProjectShared.docs.length > 0) {
        const project_shared = queryGetProjectShared.docs[0];
        await this.firebaseService.deleteDocument(
          documents.project_shared,
          project_shared.data().id,
        );
      }
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getSharedProjects(userId: string, limit, page) {
    const firestore = this.firebaseService.returnFirestore();
    let query = firestore
      .collection(documents.project_shared)
      .where('user_id', '==', userId);

    const totalSnapshot = await query.get();

    const totalProjects = totalSnapshot.size;
    const totalPages = Math.ceil(totalProjects / limit);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (currentPage - 1) * limit;
    let startAfterDoc = null;

    if (startIndex > 0 && startIndex < totalSnapshot.docs.length) {
      startAfterDoc = totalSnapshot.docs[startIndex - 1];
    }

    if (startAfterDoc) {
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.limit(limit).get();
    const project_shared: any = snapshot.docs.map((doc) => {
      const _data = doc.data();
      return {
        id: doc.id,
        ..._data,
        created_at: new Date(_data?.created_at._seconds * 1000),
        updated_at: new Date(_data?.updated_at._seconds * 1000),
      };
    });

    const getProjects = async (ps) => {
      const queryProject = await firestore
        .collection(documents.project)
        .where('id', '==', ps.project_id)
        .get();
      ps.project = queryProject.docs.map((item) => {
        return {
          id: ps.id,
          ...item.data(),
          created_at: new Date(item.data().created_at._seconds * 1000),
          updated_at: new Date(item.data().updated_at._seconds * 1000),
        };
      });

      const getItems = async (project) => {
        const queryProjectItems = await firestore
          .collection(documents.project_item)
          .where('project_id', '==', project.id)
          .get();
        project.items = queryProjectItems.docs.map((item) => {
          return {
            id: project.id,
            ...item.data(),
            created_at: new Date(item.data().created_at._seconds * 1000),
            updated_at: new Date(item.data().updated_at._seconds * 1000),
          };
        });
      };

      await Promise.all(ps.project.map(getItems));
    };

    await Promise.all(project_shared.map(getProjects));
    const projects = project_shared.map((ps) => {
      return ps.project;
    });

    return {
      currentPage,
      totalProjects,
      totalPages,
      limit,
      projects,
    };
  }

  async getPublicProjects(limit, page) {
    const firestore = this.firebaseService.returnFirestore();
    let query = firestore
      .collection(documents.project)
      .where('public', '==', true)
      .orderBy('created_at', 'desc');

    const totalSnapshot = await query.get();

    const totalProjects = totalSnapshot.size;
    const totalPages = Math.ceil(totalProjects / limit);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (currentPage - 1) * limit;
    let startAfterDoc = null;

    if (startIndex > 0 && startIndex < totalSnapshot.docs.length) {
      startAfterDoc = totalSnapshot.docs[startIndex - 1];
    }

    if (startAfterDoc) {
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.limit(limit).get();
    const projects = snapshot.docs.map((doc) => {
      const _data = doc.data();
      return {
        id: doc.id,
        ..._data,
        created_at: new Date(_data?.created_at._seconds * 1000),
        updated_at: new Date(_data?.updated_at._seconds * 1000),
      };
    });

    const getItems = async (project) => {
      const queryProjectItems = await firestore
        .collection(documents.project_item)
        .where('project_id', '==', project.id)
        .get();
      project.items = queryProjectItems.docs.map((item) => {
        return {
          id: project.id,
          ...item.data(),
          created_at: new Date(item.data().created_at._seconds * 1000),
          updated_at: new Date(item.data().updated_at._seconds * 1000),
        };
      });
    };

    await Promise.all(projects.map(getItems));

    return {
      currentPage,
      totalProjects,
      totalPages,
      limit,
      projects,
    };
  }
}
